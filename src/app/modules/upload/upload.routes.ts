import express from 'express';
import { upload } from '../../utils/cloudinary';
import { uploadController } from './upload.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';

const router = express.Router();

// POST /api/upload/image  — single image (admin only)
router.post(
    '/image',
    authMiddleware,
    authorizeRoles('admin'),
    upload.single('image'),
    uploadController.uploadSingle,
);

// POST /api/upload/images — multiple up to 10 (admin only)
router.post(
    '/images',
    authMiddleware,
    authorizeRoles('admin'),
    upload.array('images', 10),
    uploadController.uploadMultiple,
);

export const UploadRoutes = router;
