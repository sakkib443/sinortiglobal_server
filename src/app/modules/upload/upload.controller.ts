import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

// POST /api/upload/image   — single image
// POST /api/upload/images  — multiple images (max 10)

export const uploadController = {
    // ── Single image ──────────────────────────────────────────
    uploadSingle: catchAsync(async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const url = (req.file as any).path; // Cloudinary returns 'path' as the secure URL
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Image uploaded successfully',
            data: { url },
        });
    }),

    // ── Multiple images (up to 10) ────────────────────────────
    uploadMultiple: catchAsync(async (req: Request, res: Response) => {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }
        const urls = files.map((f: any) => f.path);
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: `${urls.length} image(s) uploaded successfully`,
            data: { urls },
        });
    }),
};
