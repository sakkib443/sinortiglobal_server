import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ShippingZone, ShippingRate } from './shipping.model';
import { Order } from '../order/order.model';
import QueryBuilder from '../../utils/QueryBuilder';
import AppError from '../../utils/AppError';

const ShippingController = {
    // ═══════════════════ ZONES ═══════════════════
    getZones: catchAsync(async (req: Request, res: Response) => {
        const zones = await ShippingZone.find().sort('-createdAt');
        sendResponse(res, { statusCode: 200, success: true, message: 'Zones fetched', data: zones });
    }),

    createZone: catchAsync(async (req: Request, res: Response) => {
        const zone = await ShippingZone.create(req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Zone created', data: zone });
    }),

    updateZone: catchAsync(async (req: Request, res: Response) => {
        const zone = await ShippingZone.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!zone) throw new AppError(404, 'Zone not found');
        sendResponse(res, { statusCode: 200, success: true, message: 'Zone updated', data: zone });
    }),

    deleteZone: catchAsync(async (req: Request, res: Response) => {
        const zone = await ShippingZone.findByIdAndDelete(req.params.id);
        if (!zone) throw new AppError(404, 'Zone not found');
        sendResponse(res, { statusCode: 200, success: true, message: 'Zone deleted', data: zone });
    }),

    // ═══════════════════ RATES ═══════════════════
    getRates: catchAsync(async (req: Request, res: Response) => {
        const rates = await ShippingRate.find().populate('zone', 'name').sort('-createdAt');
        sendResponse(res, { statusCode: 200, success: true, message: 'Rates fetched', data: rates });
    }),

    createRate: catchAsync(async (req: Request, res: Response) => {
        const rate = await ShippingRate.create(req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Rate created', data: rate });
    }),

    updateRate: catchAsync(async (req: Request, res: Response) => {
        const rate = await ShippingRate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!rate) throw new AppError(404, 'Rate not found');
        sendResponse(res, { statusCode: 200, success: true, message: 'Rate updated', data: rate });
    }),

    deleteRate: catchAsync(async (req: Request, res: Response) => {
        const rate = await ShippingRate.findByIdAndDelete(req.params.id);
        if (!rate) throw new AppError(404, 'Rate not found');
        sendResponse(res, { statusCode: 200, success: true, message: 'Rate deleted', data: rate });
    }),

    // ═══════════════════ SHIPMENTS (from Orders) ═══════════════════
    getShipments: catchAsync(async (req: Request, res: Response) => {
        const shipmentQuery = new QueryBuilder(
            Order.find({ status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } })
                .populate('user', 'name email phone')
                .select('orderNumber user shippingAddress total status paymentStatus createdAt trackingNumber carrier'),
            req.query as Record<string, unknown>
        ).filter().sort().paginate();

        const shipments = await shipmentQuery.modelQuery;
        const meta = await shipmentQuery.countTotal();

        const shipmentRecords = shipments.map((order: any) => ({
            _id: order._id,
            orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
            customer: order.user ? { name: order.user.name, email: order.user.email, phone: order.user.phone } : { name: 'Unknown' },
            destination: order.shippingAddress ? `${order.shippingAddress.city}, ${order.shippingAddress.area}` : 'N/A',
            address: order.shippingAddress,
            total: order.total,
            status: order.status,
            trackingNumber: order.trackingNumber || '',
            carrier: order.carrier || '',
            date: order.createdAt,
        }));

        sendResponse(res, { statusCode: 200, success: true, message: 'Shipments fetched', data: shipmentRecords, meta });
    }),

    // GET /shipping/stats
    getStats: catchAsync(async (req: Request, res: Response) => {
        const [totalShipments, toShip, inTransit, delivered] = await Promise.all([
            Order.countDocuments({ status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } }),
            Order.countDocuments({ status: { $in: ['confirmed', 'processing'] } }),
            Order.countDocuments({ status: 'shipped' }),
            Order.countDocuments({ status: 'delivered' }),
        ]);
        const zones = await ShippingZone.countDocuments();
        const rates = await ShippingRate.countDocuments();

        sendResponse(res, {
            statusCode: 200, success: true, message: 'Shipping stats fetched',
            data: { totalShipments, toShip, inTransit, delivered, zones, rates },
        });
    }),

    // PATCH /shipping/shipments/:id/status
    updateShipmentStatus: catchAsync(async (req: Request, res: Response) => {
        const order = await Order.findById(req.params.id);
        if (!order) throw new AppError(404, 'Order not found');

        order.status = req.body.status;
        if (req.body.trackingNumber) (order as any).trackingNumber = req.body.trackingNumber;
        if (req.body.carrier) (order as any).carrier = req.body.carrier;
        order.timeline.push({ status: req.body.status, note: req.body.note || 'Shipping status updated', createdAt: new Date() } as any);

        if (req.body.status === 'delivered' && order.paymentMethod === 'cod') {
            order.paymentStatus = 'paid';
        }

        await order.save();
        sendResponse(res, { statusCode: 200, success: true, message: 'Shipment status updated', data: order });
    }),

    // PATCH /shipping/shipments/:id/tracking
    updateTracking: catchAsync(async (req: Request, res: Response) => {
        const order = await Order.findById(req.params.id);
        if (!order) throw new AppError(404, 'Order not found');

        (order as any).trackingNumber = req.body.trackingNumber || '';
        (order as any).carrier = req.body.carrier || '';
        await order.save();

        sendResponse(res, { statusCode: 200, success: true, message: 'Tracking info updated', data: order });
    }),
};

export default ShippingController;
