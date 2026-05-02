import { Coupon } from './coupon.model';
import AppError from '../../utils/AppError';

const CouponService = {
    async getAll() {
        return await Coupon.find().sort({ createdAt: -1 });
    },

    async validate(code: string, orderAmount: number) {
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
        if (!coupon) throw new AppError(404, 'Invalid coupon code');
        if (coupon.expiresAt < new Date()) throw new AppError(400, 'Coupon has expired');
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError(400, 'Coupon usage limit reached');
        if (orderAmount < coupon.minOrderAmount) throw new AppError(400, `Minimum order amount is ৳${coupon.minOrderAmount}`);

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (orderAmount * coupon.discountValue) / 100;
            if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        } else {
            discount = coupon.discountValue;
        }

        return { coupon, discount };
    },

    async create(payload: any) {
        payload.code = payload.code.toUpperCase();
        const exists = await Coupon.findOne({ code: payload.code });
        if (exists) throw new AppError(400, 'Coupon code already exists');
        return await Coupon.create(payload);
    },

    async update(id: string, payload: any) {
        const coupon = await Coupon.findByIdAndUpdate(id, payload, { new: true });
        if (!coupon) throw new AppError(404, 'Coupon not found');
        return coupon;
    },

    async delete(id: string) {
        const coupon = await Coupon.findByIdAndDelete(id);
        if (!coupon) throw new AppError(404, 'Coupon not found');
        return coupon;
    },
};

export default CouponService;
