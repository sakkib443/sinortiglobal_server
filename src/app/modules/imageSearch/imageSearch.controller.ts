import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ImageSearchService from './imageSearch.service';

const ImageSearchController = {
    /**
     * POST /api/search/image
     * Body: { labels: string[], colors: string[], colorHexes?: string[], keywords?: string[] }
     */
    searchByImage: catchAsync(async (req: Request, res: Response) => {
        const { labels, colors, colorHexes, keywords } = req.body;

        if (!labels || !Array.isArray(labels)) {
            return sendResponse(res, {
                statusCode: 400,
                success: false,
                message: 'Labels array is required',
                data: null,
            });
        }

        const result = await ImageSearchService.searchByAnalyzedImage({
            labels,
            colors: colors || [],
            colorHexes: colorHexes || [],
            keywords: keywords || [],
        });

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: `Found ${result.products.length} matching products`,
            data: result,
        });
    }),
};

export default ImageSearchController;
