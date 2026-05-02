import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import config from '../config';

// ── Configure Cloudinary ───────────────────────────────────
cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key:    config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret,
});

// ── Cloudinary storage (stores uploads directly to cloud) ─
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req: any, file: any) => ({
        folder:         'dominion/products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }],
        public_id:      `product_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    }),
});

// ── Multer upload — up to 10 files, 10MB each ─────────────
export const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpg, png, webp, gif, avif)'));
        }
    },
});

export { cloudinary };
