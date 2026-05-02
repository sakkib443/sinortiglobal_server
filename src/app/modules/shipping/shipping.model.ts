import mongoose, { Schema, Document } from 'mongoose';

// ── Shipping Zone ──────────────────────────────────
export interface IShippingZone extends Document {
    name: string;
    regions: string[];
    isActive: boolean;
}

const shippingZoneSchema = new Schema<IShippingZone>({
    name: { type: String, required: true },
    regions: [{ type: String }],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const ShippingZone = mongoose.model<IShippingZone>('ShippingZone', shippingZoneSchema);

// ── Shipping Rate ──────────────────────────────────
export interface IShippingRate extends Document {
    name: string;
    zone: mongoose.Types.ObjectId;
    minWeight: number;
    maxWeight: number;
    price: number;
    estimatedDays: string;
    isActive: boolean;
}

const shippingRateSchema = new Schema<IShippingRate>({
    name: { type: String, required: true },
    zone: { type: Schema.Types.ObjectId, ref: 'ShippingZone' },
    minWeight: { type: Number, default: 0 },
    maxWeight: { type: Number, default: 999 },
    price: { type: Number, required: true },
    estimatedDays: { type: String, default: '3-5 days' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const ShippingRate = mongoose.model<IShippingRate>('ShippingRate', shippingRateSchema);
