import { Category } from './category.model';
import AppError from '../../utils/AppError';

const CategoryService = {
    async getAllCategories() {
        return await Category.find({ isDeleted: false, isActive: true })
            .populate('parent', 'name slug')
            .sort({ level: 1, order: 1, name: 1 });
    },

    async getAllCategoriesAdmin() {
        return await Category.find({ isDeleted: false })
            .populate('parent', 'name slug')
            .sort({ level: 1, order: 1 });
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
        const category = await Category.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
        if (!category) throw new AppError(404, 'Category not found');
        return category;
    },

    async deleteCategory(id: string) {
        const category = await Category.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!category) throw new AppError(404, 'Category not found');
        return category;
    },
};

export default CategoryService;
