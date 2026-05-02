import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import SearchService from './search.service';

const SearchController = {
    /**
     * POST /api/search/image
     * Body: { labels: string[], colors: string[], colorHexes: string[], keywords: string[] }
     */
    searchByImage: catchAsync(async (req: Request, res: Response) => {
        const { labels = [], colors = [], colorHexes = [], keywords = [] } = req.body;

        const result = await SearchService.searchByImage({
            labels,
            colors,
            colorHexes,
            keywords,
        });

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: `Found ${result.products.length} matching products`,
            data: result,
        });
    }),
};

export default SearchController;
