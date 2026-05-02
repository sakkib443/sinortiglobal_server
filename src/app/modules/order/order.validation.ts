import { z } from 'zod';

const orderItemValidation = z.object({
    product: z.string().min(1, 'Product ID required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
});

const shippingAddressValidation = z.object({
    fullName: z.string().min(1, 'Full name required'),
    phone: z.string().min(1, 'Phone required'),
    email: z.string().optional(),
    address: z.string().min(1, 'Address required'),
    area: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
});

export const createOrderValidation = z.object({
    body: z.object({
        items: z.array(orderItemValidation).min(1, 'At least one item required'),
        shippingAddress: shippingAddressValidation,
        paymentMethod: z.enum(['cod', 'bkash', 'card']).default('cod'),
        couponCode: z.string().optional(),
        note: z.string().optional(),
    }),
});

export const updateOrderStatusValidation = z.object({
    body: z.object({
        status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
        note: z.string().optional(),
    }),
});
