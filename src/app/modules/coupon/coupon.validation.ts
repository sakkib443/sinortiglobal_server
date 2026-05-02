import { z } from 'zod';

export const createCouponValidation = z.object({
    body: z.object({
        code: z.string().min(1).max(20),
        description: z.string().optional(),
        discountType: z.enum(['percentage', 'fixed']).default('percentage'),
        discountValue: z.number().min(0),
        maxDiscount: z.number().optional(),
        minOrderAmount: z.number().min(0).default(0),
        usageLimit: z.number().optional(),
        expiresAt: z.string().or(z.date()),
        isActive: z.boolean().default(true),
    }),
});

export const validateCouponValidation = z.object({
    body: z.object({
        code: z.string().min(1, 'Coupon code is required'),
        orderAmount: z.number().min(0),
    }),
});
