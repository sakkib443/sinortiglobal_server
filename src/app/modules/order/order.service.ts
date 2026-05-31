import { Order } from './order.model';
import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import { Coupon } from '../coupon/coupon.model';
import AppError from '../../utils/AppError';
import QueryBuilder from '../../utils/QueryBuilder';
import { notifyOrderToWhatsApp } from '../../utils/whatsappNotify';

const OrderService = {
    async getAllOrders(query: Record<string, unknown>) {
        const orderQuery = new QueryBuilder(
            Order.find({ isDeleted: { $ne: true } }).populate('user', 'firstName lastName email phone').populate('items.product', 'name thumbnail'),
            query
        ).filter().sort().paginate();

        const orders = await orderQuery.modelQuery;
        const meta = await orderQuery.countTotal();
        return { orders, meta };
    },

    async getMyOrders(userId: string, query: Record<string, unknown>) {
        const orderQuery = new QueryBuilder(
            Order.find({ user: userId, isDeleted: { $ne: true } }).populate('items.product', 'name thumbnail slug'),
            query
        ).sort().paginate();

        const orders = await orderQuery.modelQuery;
        const meta = await orderQuery.countTotal();
        return { orders, meta };
    },

    async getOrderById(id: string, userId?: string) {
        const filter: any = { _id: id };
        if (userId) filter.user = userId; // non-admin can only see their own

        const order = await Order.findOne(filter)
            .populate('user', 'firstName lastName email phone')
            .populate('items.product', 'name thumbnail slug price');
        if (!order) throw new AppError(404, 'Order not found');
        return order;
    },

    async createOrder(userId: string, payload: any) {
        const { items, shippingAddress, paymentMethod, paymentDetails, couponCode, note } = payload;

        // Get product details and calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findOne({ _id: item.product, isDeleted: false, status: 'active' });
            if (!product) throw new AppError(404, `Product not found: ${item.product}`);
            if (product.stock < item.quantity) throw new AppError(400, `Insufficient stock for: ${product.name}`);

            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                product: product._id,
                name: product.name,
                thumbnail: product.thumbnail,
                price: product.price,
                quantity: item.quantity,
                total: itemTotal,
                color: item.color || '',
                size: item.size || '',
            });
        }

        // Apply coupon
        let discount = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (coupon && coupon.expiresAt > new Date()) {
                if (coupon.discountType === 'percentage') {
                    discount = (subtotal * coupon.discountValue) / 100;
                    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
                } else {
                    discount = coupon.discountValue;
                }
            }
        }

        const shippingCost = 0; // Shipping disabled
        const total = subtotal - discount;

        // Create order
        const order = await Order.create({
            user: userId,
            items: orderItems,
            shippingAddress,
            subtotal,
            shippingCost,
            discount,
            total,
            couponCode: couponCode || '',
            paymentMethod,
            paymentDetails: paymentDetails || {},
            transactionId: paymentDetails?.transactionId || '',
            note: note || '',
            timeline: [{ status: 'pending', note: 'Order placed successfully' }],
        });

        // Update stock and product sold count
        for (const item of orderItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity, totalSold: item.quantity },
            });
        }

        // Update user stats
        await User.findByIdAndUpdate(userId, { $inc: { totalOrders: 1, totalSpent: total } });

        // Send WhatsApp notification to admin (fire & forget)
        const user = await User.findById(userId);
        notifyOrderToWhatsApp({
            orderNumber: order.orderId || order._id.toString(),
            customerName: shippingAddress.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            customerPhone: shippingAddress.phone || user?.phone || '',
            address: shippingAddress.address || '',
            items: orderItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, color: i.color, size: i.size })),
            total,
            note: note || '',
        }).catch(() => {}); // never block order flow

        return order;
    },

    // ── Guest checkout: auto-create user + place order ────────────────
    async createGuestOrder(payload: any) {
        const { shippingAddress, paymentMethod, items, couponCode, note, password } = payload;
        const { fullName, email, phone } = shippingAddress;

        if (!phone || !fullName) {
            throw new AppError(400, 'Full name and phone number are required for checkout');
        }

        // Auto-generate guest email from phone if not provided
        const guestEmail = email || `${phone.replace(/\s+/g, '')}@guest.sinotriglobal.com`;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ email: guestEmail.toLowerCase() }, { phone }] });
        let isNewUser = false;

        if (!user) {
            // Auto-create account: phone number as password
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || 'Customer';
            const lastName = nameParts.slice(1).join(' ') || '.';

            user = await User.create({
                email: guestEmail.toLowerCase(),
                password: password || guestEmail.toLowerCase(),   // email is both login ID and password
                firstName,
                lastName,
                phone,
                role: 'user',
                status: 'active',
                isEmailVerified: false,
            });
            isNewUser = true;
        }

        // Now create order using the existing createOrder method
        const order = await this.createOrder(user._id!.toString(), payload);

        // Generate token for auto-login
        const jwt = require('jsonwebtoken');
        const appConfig = require('../../config').default;
        const accessToken = jwt.sign(
            { userId: user._id!.toString(), email: user.email, role: user.role },
            appConfig.jwt.access_secret,
            { expiresIn: appConfig.jwt.access_expires_in }
        );

        return {
            order,
            user: {
                _id: user._id!.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                phone: user.phone,
            },
            accessToken,
            isNewUser,
        };
    },

    async updateOrderStatus(id: string, status: string, note?: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        order.status = status as any;
        order.timeline.push({ status, note: note || '', createdAt: new Date() } as any);

        // Update payment status when delivered
        if (status === 'delivered' && order.paymentMethod === 'cod') {
            order.paymentStatus = 'paid';
        }

        await order.save();
        return order;
    },

    async cancelOrder(id: string, userId: string) {
        const order = await Order.findOne({ _id: id, user: userId });
        if (!order) throw new AppError(404, 'Order not found');
        if (!['pending', 'confirmed'].includes(order.status)) {
            throw new AppError(400, 'Order cannot be cancelled at this stage');
        }

        order.status = 'cancelled';
        order.timeline.push({ status: 'cancelled', note: 'Cancelled by user', createdAt: new Date() } as any);
        await order.save();

        // Restore stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }

        return order;
    },

    async updatePaymentStatus(id: string, paymentStatus: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        order.paymentStatus = paymentStatus as any;
        if (paymentStatus === 'paid') {
            order.transactionId = order.transactionId || `PAY-${Date.now()}`;
        }
        order.timeline.push({ status: `payment_${paymentStatus}`, note: `Payment marked as ${paymentStatus}`, createdAt: new Date() } as any);
        await order.save();
        return order;
    },

    async addAdminNote(id: string, note: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        order.timeline.push({ status: 'admin_note', note, createdAt: new Date() } as any);
        await order.save();
        return order;
    },

    async getOrderStats() {
        const notDeleted = { isDeleted: { $ne: true } };
        const [total, pending, confirmed, processing, shipped, delivered, cancelled] = await Promise.all([
            Order.countDocuments({ ...notDeleted }),
            Order.countDocuments({ ...notDeleted, status: 'pending' }),
            Order.countDocuments({ ...notDeleted, status: 'confirmed' }),
            Order.countDocuments({ ...notDeleted, status: 'processing' }),
            Order.countDocuments({ ...notDeleted, status: 'shipped' }),
            Order.countDocuments({ ...notDeleted, status: 'delivered' }),
            Order.countDocuments({ ...notDeleted, status: 'cancelled' }),
        ]);

        const revenueData = await Order.aggregate([
            { $match: { status: 'delivered', isDeleted: { $ne: true } } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ]);

        return { total, pending, confirmed, processing, shipped, delivered, cancelled, totalRevenue: revenueData[0]?.totalRevenue || 0 };
    },

    // ── Soft-delete an order (admin) — preserves the record, hides it from listings ──
    async deleteOrder(id: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');
        if ((order as any).isDeleted) throw new AppError(400, 'Order is already deleted');

        (order as any).isDeleted = true;
        order.timeline.push({ status: 'deleted', note: 'Order deleted by admin', createdAt: new Date() } as any);
        await order.save();
        return order;
    },
};

export default OrderService;
