import { Inquiry } from './inquiry.model';
import { Product } from '../product/product.model';
import { notifyInquiryToWhatsApp } from '../../utils/whatsappNotify';

const InquiryService = {
    async create(payload: any) {
        const inquiry = await Inquiry.create(payload);

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

    async updateStatus(id: string, payload: any) {
        return Inquiry.findByIdAndUpdate(
            id,
            { status: payload.status, adminReply: payload.adminReply },
            { new: true, runValidators: true },
        );
    },

    async delete(id: string) {
        return Inquiry.findByIdAndDelete(id);
    },
};

export default InquiryService;
