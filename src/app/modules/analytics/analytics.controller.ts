import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { Order } from '../order/order.model';
import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import { Category } from '../category/category.model';

const AnalyticsController = {
    // GET /analytics/dashboard — Main dashboard summary
    getDashboardSummary: catchAsync(async (req: Request, res: Response) => {
        const [
            totalOrders,
            totalProducts,
            totalCustomers,
            totalCategories,
            pendingOrders,
            deliveredOrders,
        ] = await Promise.all([
            Order.countDocuments(),
            Product.countDocuments({ isDeleted: false }),
            User.countDocuments({ role: 'user' }),
            Category.countDocuments({ isActive: true }),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'delivered' }),
        ]);

        const revenueData = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ]);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayOrders = await Order.countDocuments({ createdAt: { $gte: todayStart } });

        const todayRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: todayStart }, paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Dashboard summary fetched',
            data: {
                totalRevenue: revenueData[0]?.totalRevenue || 0,
                totalOrders,
                totalProducts,
                totalCustomers,
                totalCategories,
                pendingOrders,
                deliveredOrders,
                todayOrders,
                todayRevenue: todayRevenue[0]?.total || 0,
            },
        });
    }),

    // GET /analytics/monthly-revenue
    getMonthlyRevenue: catchAsync(async (req: Request, res: Response) => {
        const monthlyRevenue = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 },
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const data = monthlyRevenue.map((item) => ({
            month: months[item._id.month - 1],
            year: item._id.year,
            revenue: item.revenue,
            orders: item.orders,
        }));

        sendResponse(res, { statusCode: 200, success: true, message: 'Monthly revenue fetched', data });
    }),

    // GET /analytics/recent-orders
    getRecentOrders: catchAsync(async (req: Request, res: Response) => {
        const limit = Number(req.query.limit) || 10;
        const orders = await Order.find()
            .populate('user', 'name email')
            .sort('-createdAt')
            .limit(limit)
            .select('orderNumber user total status paymentStatus paymentMethod items createdAt');

        sendResponse(res, { statusCode: 200, success: true, message: 'Recent orders fetched', data: orders });
    }),

    // GET /analytics/top-products
    getTopProducts: catchAsync(async (req: Request, res: Response) => {
        const limit = Number(req.query.limit) || 10;
        const topProducts = await Product.find({ isDeleted: false })
            .sort('-totalSold')
            .limit(limit)
            .select('name thumbnail price totalSold stock category averageRating');

        sendResponse(res, { statusCode: 200, success: true, message: 'Top products fetched', data: topProducts });
    }),

    // GET /analytics/sales-by-category
    getSalesByCategory: catchAsync(async (req: Request, res: Response) => {
        const salesByCategory = await Order.aggregate([
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productInfo',
                },
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$categoryInfo._id',
                    name: { $first: '$categoryInfo.name' },
                    totalSales: { $sum: '$items.total' },
                    totalItems: { $sum: '$items.quantity' },
                },
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 },
        ]);

        sendResponse(res, { statusCode: 200, success: true, message: 'Sales by category fetched', data: salesByCategory });
    }),

    // GET /analytics/revenue
    getRevenueStats: catchAsync(async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query;
        const match: any = { paymentStatus: 'paid' };

        if (startDate) match.createdAt = { $gte: new Date(startDate as string) };
        if (endDate) {
            match.createdAt = { ...match.createdAt, $lte: new Date(endDate as string) };
        }

        const dailyRevenue = await Order.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        sendResponse(res, { statusCode: 200, success: true, message: 'Revenue stats fetched', data: dailyRevenue });
    }),
};

export default AnalyticsController;
