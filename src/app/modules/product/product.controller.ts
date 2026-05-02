import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ProductService from './product.service';

const ProductController = {
    getAll: catchAsync(async (req: Request, res: Response) => {
        const { products, meta } = await ProductService.getAllProducts(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Products fetched', data: products, meta });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const product = await ProductService.getProductById(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Product fetched', data: product });
    }),

    getBySlug: catchAsync(async (req: Request, res: Response) => {
        const product = await ProductService.getProductBySlug(req.params.slug);
        sendResponse(res, { statusCode: 200, success: true, message: 'Product fetched', data: product });
    }),

    getStats: catchAsync(async (req: Request, res: Response) => {
        const stats = await ProductService.getProductStats();
        sendResponse(res, { statusCode: 200, success: true, message: 'Product stats fetched', data: stats });
    }),

    getFeatured: catchAsync(async (req: Request, res: Response) => {
        const products = await ProductService.getFeaturedProducts(Number(req.query.limit) || 8);
        sendResponse(res, { statusCode: 200, success: true, message: 'Featured products fetched', data: products });
    }),

    getRelated: catchAsync(async (req: Request, res: Response) => {
        const { id, categoryId } = req.params;
        const products = await ProductService.getRelatedProducts(id, categoryId, Number(req.query.limit) || 6);
        sendResponse(res, { statusCode: 200, success: true, message: 'Related products fetched', data: products });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        const product = await ProductService.createProduct(req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Product created', data: product });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const product = await ProductService.updateProduct(req.params.id, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Product updated', data: product });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        await ProductService.deleteProduct(req.params.id);
        sendResponse(res, { statusCode: 200, success: true, message: 'Product deleted' });
    }),

    bulkUpdateStatus: catchAsync(async (req: Request, res: Response) => {
        const result = await ProductService.bulkUpdateStatus(req.body.ids, req.body.status);
        sendResponse(res, { statusCode: 200, success: true, message: 'Products status updated', data: result });
    }),

    bulkDelete: catchAsync(async (req: Request, res: Response) => {
        const result = await ProductService.bulkDelete(req.body.ids);
        sendResponse(res, { statusCode: 200, success: true, message: 'Products deleted', data: result });
    }),

    incrementStat: catchAsync(async (req: Request, res: Response) => {
        const product = await ProductService.incrementStat(req.params.id, req.body.field);
        sendResponse(res, { statusCode: 200, success: true, message: 'Stat updated', data: product });
    }),
};

export default ProductController;
