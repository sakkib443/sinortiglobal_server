import { Schema, model } from 'mongoose';

const inquirySchema = new Schema(
    {
        // Optional — product inquiries link to a product; general inquiries
        // (contact, rfq, expert) have no product.
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        // Where the inquiry came from
        type: { type: String, enum: ['product', 'contact', 'rfq', 'expert'], default: 'product' },
        name: { type: String, required: true, maxlength: 100, trim: true },
        phone: { type: String, required: true, maxlength: 100, trim: true }, // phone or email
        email: { type: String, maxlength: 200, trim: true },
        subject: { type: String, maxlength: 200, trim: true },
        message: { type: String, required: true, maxlength: 2000, trim: true },
        status: { type: String, enum: ['pending', 'replied', 'closed'], default: 'pending' },
        adminReply: { type: String, default: '' },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

inquirySchema.index({ product: 1, createdAt: -1 });
inquirySchema.index({ type: 1, createdAt: -1 });
inquirySchema.index({ status: 1 });

export const Inquiry = model('Inquiry', inquirySchema);
