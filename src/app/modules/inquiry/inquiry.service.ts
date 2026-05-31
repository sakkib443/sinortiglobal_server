import { Inquiry } from './inquiry.model';
import { Product } from '../product/product.model';
import { notifyInquiryToWhatsApp } from '../../utils/whatsappNotify';

const InquiryService = {
    async create(payload: any) {
        // Whitelist creatable fields — this endpoint is public, so never trust
        // client-supplied status / adminReply / quotedPrice.
        const clean = {
            product: payload.product || undefined,
            user: payload.user || null,
            type: payload.type || 'product',
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
            subject: payload.subject,
            message: payload.message,
            attachments: Array.isArray(payload.attachments) ? payload.attachments.slice(0, 10) : [],
        };
        const inquiry = await Inquiry.create(clean);

        // Notify admin on WhatsApp (fire & forget — never block the inquiry).
        // General inquiries (contact/rfq/expert) have no product.
        let productName = '';
        if (payload.product) {
            const product = await Product.findById(payload.product).select('name');
            productName = product?.name || 'Unknown Product';
        } else {
            productName = payload.subject || `${payload.type || 'General'} inquiry`;
        }
        notifyInquiryToWhatsApp({
            customerName: payload.name || '',
            customerPhone: payload.phone || '',
            productName,
            message: payload.message || '',
            color: payload.color || '',
            size: payload.size || '',
        }).catch(() => {});

        return inquiry;
    },

    async getAll(query: Record<string, unknown>) {
        const filter: any = {};
        const { status, product, type, search } = query;
        if (status) filter.status = status;
        if (product) filter.product = product;
        if (type) filter.type = type;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
            ];
        }

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const inquiries = await Inquiry.find(filter)
            .populate('product', 'name slug images price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Inquiry.countDocuments(filter);
        return { inquiries, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    async getByProduct(productId: string) {
        return Inquiry.find({ product: productId }).sort({ createdAt: -1 });
    },

    // Logged-in customer's own inquiries / RFQs (with admin quotes)
    async getMy(userId: string, query: Record<string, unknown>) {
        const filter: any = { user: userId };
        if (query.type) filter.type = query.type;

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const inquiries = await Inquiry.find(filter)
            .populate('product', 'name slug thumbnail price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Inquiry.countDocuments(filter);
        return { inquiries, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    async updateStatus(id: string, payload: any) {
        const update: any = {};
        if (payload.status !== undefined) update.status = payload.status;
        if (payload.adminReply !== undefined) update.adminReply = payload.adminReply;
        if (payload.quotedPrice !== undefined) {
            update.quotedPrice = payload.quotedPrice === '' || payload.quotedPrice === null ? null : Number(payload.quotedPrice);
        }
        // Stamp the reply time when a quote/reply is sent
        if (payload.status === 'replied' || payload.adminReply) update.repliedAt = new Date();

        return Inquiry.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    },

    async delete(id: string) {
        return Inquiry.findByIdAndDelete(id);
    },
};

export default InquiryService;
