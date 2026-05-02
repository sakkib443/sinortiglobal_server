import { Product } from './product.model';
import { Category } from '../category/category.model';
import AppError from '../../utils/AppError';
import QueryBuilder from '../../utils/QueryBuilder';

const ProductService = {
    // ── Get all products (public, with full filtering) ──────────────────
    async getAllProducts(query: Record<string, unknown>) {
        // If searching, also look for matching categories by name
        let categoryIds: string[] = [];
        if (query.searchTerm) {
            const matchingCategories = await Category.find({
                name: { $regex: query.searchTerm as string, $options: 'i' },
            }).select('_id');
            categoryIds = matchingCategories.map((c) => c._id.toString());
        }

        // Build base query — if we found matching categories, include them
        let baseFilter: any = { isDeleted: false };
        if (categoryIds.length > 0 && query.searchTerm) {
            // Will be merged with search conditions via $and
            baseFilter = {
                isDeleted: false,
                $or: [
                    { category: { $in: categoryIds } },
                    // The QueryBuilder.search() will add field-level search conditions
                    { _searchPlaceholder: true },
                ],
            };
        }

        const productQuery = new QueryBuilder(
            Product.find(categoryIds.length > 0 ? { isDeleted: false } : baseFilter)
                .populate('category', 'name slug'),
            query
        )
            .search(['name', 'description', 'tags', 'colors', 'aiLabels', 'slug'])
            .filter()
            .sort()
            .paginate()
            .fields();

        // If we have matching category IDs, merge them into the query
        if (categoryIds.length > 0 && query.searchTerm) {
            const currentFilter = productQuery.modelQuery.getFilter();
            productQuery.modelQuery = Product.find({
                isDeleted: false,
                $or: [
                    { category: { $in: categoryIds } },
                    ...(currentFilter.$and || [currentFilter]),
                ],
            })
                .populate('category', 'name slug');

            // Re-apply sort, paginate, fields
            const sort = (query?.sort as string)?.split(',')?.join(' ') || '-createdAt';
            const page = Number(query?.page) || 1;
            const limit = Number(query?.limit) || 10;
            const skip = (page - 1) * limit;
            productQuery.modelQuery = productQuery.modelQuery.sort(sort).skip(skip).limit(limit);
        }

        const products = await productQuery.modelQuery;
        const meta = await productQuery.countTotal();
        return { products, meta };
    },

    // ── Get single product ──────────────────────────────────────────────
    async getProductById(id: string) {
        const product = await Product.findOne({ _id: id, isDeleted: false })
            .populate('category', 'name slug');
        if (!product) throw new AppError(404, 'Product not found');

        // Increment view count
        await Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
        return product;
    },

    // ── Get product by slug ─────────────────────────────────────────────
    async getProductBySlug(slug: string) {
        const product = await Product.findOne({ slug, isDeleted: false })
            .populate('category', 'name slug');
        if (!product) throw new AppError(404, 'Product not found');
        await Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } });
        return product;
    },

    // ── Admin stats ─────────────────────────────────────────────────────
    async getProductStats() {
        const [total, active, draft, outOfStock] = await Promise.all([
            Product.countDocuments({ isDeleted: false }),
            Product.countDocuments({ isDeleted: false, status: 'active' }),
            Product.countDocuments({ isDeleted: false, status: 'draft' }),
            Product.countDocuments({ isDeleted: false, status: 'out-of-stock' }),
        ]);
        return { total, active, draft, outOfStock };
    },

    // ── Create product ──────────────────────────────────────────────────
    async createProduct(payload: any) {
        const product = await Product.create(payload);

        // Update category product count
        await Category.findByIdAndUpdate(payload.category, { $inc: { productCount: 1 } });

        return product;
    },

    // ── Update product ──────────────────────────────────────────────────
    async updateProduct(id: string, payload: any) {
        // Remove discount from payload — it's auto-calculated in pre-save
        delete payload.discount;
        const product = await Product.findOneAndUpdate(
            { _id: id, isDeleted: false },
            payload,
            { new: true, runValidators: true }
        ).populate('category', 'name slug');
        if (!product) throw new AppError(404, 'Product not found');
        return product;
    },

    // ── Delete product (soft) ───────────────────────────────────────────
    async deleteProduct(id: string) {
        const product = await Product.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!product) throw new AppError(404, 'Product not found');

        // Update category product count
        await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
        return product;
    },

    // ── Bulk status update ──────────────────────────────────────────────
    async bulkUpdateStatus(ids: string[], status: string) {
        const result = await Product.updateMany(
            { _id: { $in: ids }, isDeleted: false },
            { status }
        );
        return result;
    },

    // ── Bulk delete ─────────────────────────────────────────────────────
    async bulkDelete(ids: string[]) {
        const result = await Product.updateMany({ _id: { $in: ids } }, { isDeleted: true });
        return result;
    },

    // ── Update stock (no longer needed — stock field removed) ───────────
    // Kept for API compatibility; status can still be set to out-of-stock manually

    // ── Featured products (top selling active products) ─────────────────
    async getFeaturedProducts(limit = 8) {
        return await Product.find({ isDeleted: false, status: 'active' })
            .populate('category', 'name slug')
            .sort({ totalSold: -1 })
            .limit(limit);
    },

    // ── Related products (same category) ────────────────────────────────
    async getRelatedProducts(productId: string, categoryId: string, limit = 6) {
        return await Product.find({
            _id: { $ne: productId },
            category: categoryId,
            isDeleted: false,
            status: 'active',
        })
            .populate('category', 'name slug')
            .sort({ rating: -1 })
            .limit(limit);
    },

    // ── Increment stat (like, share, view, comment) ─────────────────────
    async incrementStat(id: string, field: string) {
        const allowedFields = ['likeCount', 'shareCount', 'viewCount', 'commentCount'];
        if (!allowedFields.includes(field)) {
            throw new AppError(400, `Invalid stat field: ${field}`);
        }
        const product = await Product.findByIdAndUpdate(
            id,
            { $inc: { [field]: 1 } },
            { new: true }
        );
        if (!product) throw new AppError(404, 'Product not found');
        return product;
    },
};

export default ProductService;
