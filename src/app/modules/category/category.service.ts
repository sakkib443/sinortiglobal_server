import { Category } from './category.model';
import { Product } from '../product/product.model';
import AppError from '../../utils/AppError';

// Attach real-time product counts (active, not deleted) to each category.
// A product counts toward BOTH its category and its subcategory (if set).
const attachProductCounts = async (categories: any[]) => {
    const counts = await Product.aggregate([
        { $match: { isDeleted: false, status: 'active' } },
        {
            $project: {
                cats: {
                    $setUnion: [
                        ['$category'],
                        { $cond: [{ $ifNull: ['$subcategory', false] }, ['$subcategory'], []] },
                    ],
                },
            },
        },
        { $unwind: '$cats' },
        { $group: { _id: '$cats', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    counts.forEach((c: any) => { if (c._id) countMap[String(c._id)] = c.count; });

    return categories.map((cat: any) => ({
        ...cat,
        id: String(cat._id),
        productCount: countMap[String(cat._id)] || 0,
    }));
};

const CategoryService = {
    async getAllCategories() {
        const categories = await Category.find({ isDeleted: false, isActive: true })
            .populate('parent', 'name slug')
            .sort({ level: 1, order: 1, name: 1 })
            .lean();
        return attachProductCounts(categories);
    },

    async getAllCategoriesAdmin() {
        const categories = await Category.find({ isDeleted: false })
            .populate('parent', 'name slug')
            .sort({ level: 1, order: 1 })
            .lean();
        return attachProductCounts(categories);
    },

    async getCategoryById(id: string) {
        const category = await Category.findById(id).populate('parent', 'name slug');
        if (!category || category.isDeleted) throw new AppError(404, 'Category not found');
        return category;
    },

    async createCategory(payload: any) {
        // Set level based on parent
        if (payload.parent) {
            const parent = await Category.findById(payload.parent);
            if (!parent) throw new AppError(404, 'Parent category not found');
            payload.level = parent.level + 1;
        } else {
            payload.level = 0;
        }

        // Auto-generate slug from name
        payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const existing = await Category.findOne({ slug: payload.slug });
        if (existing) payload.slug = `${payload.slug}-${Date.now()}`;

        return await Category.create(payload);
    },

    async updateCategory(id: string, payload: any) {
        if (payload.name) {
            payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }

        // Handle parent change — re-derive level and guard against invalid hierarchy
        if ('parent' in payload) {
            const parentId = payload.parent || null;
            if (parentId) {
                if (String(parentId) === String(id)) {
                    throw new AppError(400, 'A category cannot be its own parent');
                }
                const parent = await Category.findById(parentId);
                if (!parent || parent.isDeleted) throw new AppError(404, 'Parent category not found');
                // Prevent picking one of this category's own descendants as parent (cycle)
                if (String(parent.parent) === String(id)) {
                    throw new AppError(400, 'Cannot set a subcategory of this category as its parent');
                }
                payload.parent = parentId;
                payload.level = parent.level + 1;
            } else {
                payload.parent = null;
                payload.level = 0;
            }
        }

        const category = await Category.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
        if (!category) throw new AppError(404, 'Category not found');
        return category;
    },

    async deleteCategory(id: string) {
        const category = await Category.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!category) throw new AppError(404, 'Category not found');
        // Cascade: soft-delete any subcategories so no orphans are left behind
        await Category.updateMany({ parent: id, isDeleted: false }, { isDeleted: true });
        return category;
    },
};

export default CategoryService;
