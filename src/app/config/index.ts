import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    database_url: process.env.DATABASE_URL || 'mongodb://localhost:27017/dominion',

    jwt: {
        access_secret: process.env.JWT_ACCESS_SECRET || 'dominion-access-secret',
        refresh_secret: process.env.JWT_REFRESH_SECRET || 'dominion-refresh-secret',
        access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
        refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
        api_key: process.env.CLOUDINARY_API_KEY || '',
        api_secret: process.env.CLOUDINARY_API_SECRET || '',
    },

    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
        from: process.env.EMAIL_FROM || 'noreply@dominion.com',
    },

    frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',

    pagination: {
        default_page: 1,
        default_limit: 10,
        max_limit: 100,
    },

    bkash: {
        app_key: process.env.BKASH_APP_KEY || '',
        app_secret: process.env.BKASH_APP_SECRET || '',
        username: process.env.BKASH_USERNAME || '',
        password: process.env.BKASH_PASSWORD || '',
        base_url: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
    },
};
