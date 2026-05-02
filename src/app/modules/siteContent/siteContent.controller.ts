import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import SiteContentService from './siteContent.service';

const SiteContentController = {
    // GET /api/site-content — Public
    get: catchAsync(async (req: Request, res: Response) => {
        const content = await SiteContentService.get();
        sendResponse(res, { statusCode: 200, success: true, message: 'Site content fetched', data: content });
    }),

    // PUT /api/site-content — Admin only (full update)
    update: catchAsync(async (req: Request, res: Response) => {
        const content = await SiteContentService.update(req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Site content updated', data: content });
    }),

    // PATCH /api/site-content/:section — Admin only (section update)
    updateSection: catchAsync(async (req: Request, res: Response) => {
        const { section } = req.params;
        const validSections = ['ticker', 'contact', 'floating', 'footer', 'defaultTagline', 'seo', 'announcement'];
        if (!validSections.includes(section)) {
            return sendResponse(res, { statusCode: 400, success: false, message: `Invalid section: ${section}` });
        }
        const content = await SiteContentService.updateSection(section, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: `${section} updated`, data: content });
    }),
};

export default SiteContentController;
