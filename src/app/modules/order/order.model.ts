import { Schema, model } from 'mongoose';

const orderItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    thumbnail: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true },
    color: { type: String, default: '' },
    size: { type: String, default: '' },
}, { _id: true });

const timelineSchema = new Schema({
    status: { type: String },
    note: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const shippingAddressSchema = new Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    address: { type: String, required: true },
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    postalCode: { type: String, default: '' },
}, { _id: false });

const orderSchema = new Schema(
    {
        orderId: { type: String, unique: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        items: { type: [orderItemSchema], required: true },
        shippingAddress: { type: shippingAddressSchema, required: true },

        // Pricing
        subtotal: { type: Number, required: true },
        shippingCost: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, required: true },
        couponCode: { type: String, default: '' },

        // Status
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['cod', 'bkash', 'card'],
            default: 'cod',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        transactionId: { type: String, default: '' },
        trackingNumber: { type: String, default: '' },
        carrier: { type: String, default: '' },

        note: { type: String, default: '' },
        timeline: { type: [timelineSchema], default: [] },
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

// Auto-generate order ID
orderSchema.pre('save', async function (next) {
    if (!this.orderId) {
        const count = await (this.constructor as any).countDocuments();
        this.orderId = `DOM-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = model('Order', orderSchema);
