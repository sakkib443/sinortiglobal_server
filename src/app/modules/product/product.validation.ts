import { z } from 'zod';

export const createProductValidation = z.object({
    body: z.object({
        name:          z.string().min(1, 'Product name is required').max(200),
        description:   z.string().min(1, 'Description is required'),
        tagline:       z.string().max(200).optional(),
        priceType:     z.enum(['fixed', 'negotiable']).optional(),
        slug:          z.string().optional(),

        // Pricing — discount is auto-calculated, no need to send it
        price:         z.number().min(0, 'Price must be positive'),
        originalPrice: z.number().min(0).optional().nullable(),

        // Images
        thumbnail: z.string().min(1, 'Thumbnail is required'),
        images:    z.array(z.string()).optional(),

        // Category
        category: z.string().min(1, 'Category is required'),

        // Status
        status:     z.enum(['active', 'draft', 'out-of-stock']).optional(),
        visibility: z.enum(['visible', 'hidden']).optional(),

        // Base stock (used when no variants)
        stock: z.number().min(0).optional(),

        // Image Search / Filter
        tags:     z.array(z.string()).optional(),
        colors:   z.array(z.string()).optional(),
        colorHex: z.array(z.string()).optional(),
        sizes:    z.array(z.string()).optional(),
        aiLabels: z.array(z.string()).optional(),

        // Variants — each color+size combo with its own price/stock/images
        variants: z.array(
            z.object({
                label:         z.string().optional(),
                color:         z.string().optional(),
                colorHex:      z.string().optional(),
                size:          z.string().optional(),
                price:         z.number().min(0, 'Variant price required'),
                originalPrice: z.number().min(0).optional().nullable(),
                stock:         z.number().min(0).optional(),
                sku:           z.string().optional(),
                images:        z.array(z.string()).optional(),
                note:          z.string().optional(),
            })
        ).optional(),

        // Content Tabs
        deliveryInfo: z.string().optional(),
        paymentInfo:  z.string().optional(),
        termsInfo:    z.string().optional(),
    }),
});

export const updateProductValidation = z.object({
    body: createProductValidation.shape.body.partial(),
});

export const bulkStatusValidation = z.object({
    body: z.object({
        ids:    z.array(z.string()).min(1),
        status: z.enum(['active', 'draft', 'out-of-stock']),
    }),
});

export const bulkDeleteValidation = z.object({
    body: z.object({
        ids: z.array(z.string()).min(1),
    }),
});
