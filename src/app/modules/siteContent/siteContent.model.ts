import { Schema, model } from 'mongoose';

// ── Ticker Item ──
const tickerItemSchema = new Schema({
    text: { type: String, required: true },
    emoji: { type: String, default: '' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { _id: true });

// ── Contact Info ──
const businessHourSchema = new Schema({
    day: { type: String, required: true },
    time: { type: String, required: true },
}, { _id: true });

const socialLinkSchema = new Schema({
    label: { type: String, required: true },
    url: { type: String, default: '#' },
    color: { type: String, default: '#000000' },
}, { _id: true });

// ── Main Site Content Schema ──
const siteContentSchema = new Schema({
    // Only one document — singleton
    _key: { type: String, default: 'main', unique: true },

    // ── Header Ticker ──
    ticker: [tickerItemSchema],

    // ── Contact Page ──
    contact: {
        phone: { type: String, default: '' },
        whatsapp: { type: String, default: '' },
        email: { type: String, default: '' },
        address: { type: String, default: '' },
        hours: [businessHourSchema],
        tips: [{ type: String }],
        socials: [socialLinkSchema],
        subjects: [{ type: String }],
    },

    // ── Floating Widget ──
    floating: {
        phone: { type: String, default: '' },
        whatsapp: { type: String, default: '' },
        messenger: { type: String, default: '' },
        showPhone: { type: Boolean, default: true },
        showWhatsapp: { type: Boolean, default: true },
        showMessenger: { type: Boolean, default: true },
    },

    // ── Footer ──
    footer: {
        companyName: { type: String, default: 'Sinotri Global' },
        copyright: { type: String, default: '' },
        links: [{
            label: { type: String, required: true },
            url: { type: String, required: true },
        }],
    },

    // ── Default Product Tagline ──
    defaultTagline: { type: String, default: 'Lower price than others but quality higher' },

    // ── SEO / Meta ──
    seo: {
        title: { type: String, default: 'Sinotri Global - Premium Online Shopping Experience' },
        description: { type: String, default: 'Shop the latest products with amazing deals at Sinotri Global.' },
        keywords: { type: String, default: 'sinotri global, ecommerce, online shopping' },
    },

    // ── Announcement Bar ──
    announcement: {
        message: { type: String, default: '' },
        bgColor: { type: String, default: '#E4525C' },
        textColor: { type: String, default: '#FFFFFF' },
        active: { type: Boolean, default: false },
        dismissible: { type: Boolean, default: true },
    },

    // ── Legal Pages (Terms, Privacy, Refund) ──
    legalPages: [{
        slug: { type: String, required: true, enum: ['terms', 'privacy', 'refund'] },
        title: { type: String, required: true },
        content: { type: String, default: '' },
        active: { type: Boolean, default: true },
        lastUpdated: { type: Date, default: Date.now },
    }],

    // ── Theme / Appearance ──
    theme: {
        primaryColor: { type: String, default: '#0B4222' },
        secondaryColor: { type: String, default: '#E4525C' },
        logoUrl: { type: String, default: '' },
        faviconUrl: { type: String, default: '' },
    },

    // ── Hero Slides ──
    heroSlides: [{
        imageUrl: { type: String, required: true },
        active: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    }],

}, { timestamps: true });

export const SiteContent = model('SiteContent', siteContentSchema);
