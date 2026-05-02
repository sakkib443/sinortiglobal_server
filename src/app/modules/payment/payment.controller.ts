import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { Order } from '../order/order.model';
import QueryBuilder from '../../utils/QueryBuilder';

const PaymentController = {
    // GET /payments/admin/all
    getAll: catchAsync(async (req: Request, res: Response) => {
        const paymentQuery = new QueryBuilder(
            Order.find({ paymentMethod: { $exists: true } })
                .populate('user', 'name email phone')
                .select('orderNumber user total paymentMethod paymentStatus transactionId createdAt status'),
            req.query as Record<string, unknown>
        ).filter().sort().paginate();

        const payments = await paymentQuery.modelQuery;
        const meta = await paymentQuery.countTotal();

        // Transform orders into payment records
        const paymentRecords = payments.map((order: any) => ({
            _id: order._id,
            transactionId: order.transactionId || `TXN-${order._id.toString().slice(-8).toUpperCase()}`,
            orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
            customer: order.user ? {
                name: order.user.name,
                email: order.user.email,
                phone: order.user.phone,
            } : { name: 'Unknown', email: 'N/A' },
            amount: order.total,
            method: order.paymentMethod,
            status: order.paymentStatus,
            orderStatus: order.status,
            date: order.createdAt,
        }));

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Payments fetched',
            data: paymentRecords,
            meta,
        });
    }),

    // GET /payments/admin/stats
    getStats: catchAsync(async (req: Request, res: Response) => {
        const [totalPaid, totalPending, totalRefunded, totalFailed] = await Promise.all([
            Order.countDocuments({ paymentStatus: 'paid' }),
            Order.countDocuments({ paymentStatus: 'pending' }),
            Order.countDocuments({ paymentStatus: 'refunded' }),
            Order.countDocuments({ paymentStatus: 'failed' }),
        ]);

        const revenueData = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ]);

        const pendingAmount = await Order.aggregate([
            { $match: { paymentStatus: 'pending' } },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);

        const methodStats = await Order.aggregate([
            { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } },
        ]);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Payment stats fetched',
            data: {
                totalPaid,
                totalPending,
                totalRefunded,
                totalFailed,
                totalRevenue: revenueData[0]?.totalRevenue || 0,
                pendingAmount: pendingAmount[0]?.total || 0,
                methodStats,
            },
        });
    }),

    // PATCH /payments/admin/:id/cod-paid
    markCODPaid: catchAsync(async (req: Request, res: Response) => {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return sendResponse(res, { statusCode: 404, success: false, message: 'Order not found' });
        }

        order.paymentStatus = 'paid';
        order.transactionId = `COD-${Date.now()}`;
        order.timeline.push({ status: 'payment_received', note: 'COD payment marked as paid by admin', createdAt: new Date() } as any);
        await order.save();

        sendResponse(res, { statusCode: 200, success: true, message: 'COD payment marked as paid', data: order });
    }),

    // POST /payments/admin/:id/refund
    refundPayment: catchAsync(async (req: Request, res: Response) => {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return sendResponse(res, { statusCode: 404, success: false, message: 'Order not found' });
        }

        order.paymentStatus = 'refunded';
        order.timeline.push({ status: 'refunded', note: 'Payment refunded by admin', createdAt: new Date() } as any);
        await order.save();

        sendResponse(res, { statusCode: 200, success: true, message: 'Payment refunded', data: order });
    }),
};

export default PaymentController;
