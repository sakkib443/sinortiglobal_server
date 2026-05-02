import express from 'express';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import ShippingController from './shipping.controller';

const router = express.Router();

// All shipping routes require admin auth
router.use(authMiddleware, authorizeRoles('admin'));

// Zones
router.get('/zones', ShippingController.getZones);
router.post('/zones', ShippingController.createZone);
router.patch('/zones/:id', ShippingController.updateZone);
router.delete('/zones/:id', ShippingController.deleteZone);

// Rates
router.get('/rates', ShippingController.getRates);
router.post('/rates', ShippingController.createRate);
router.patch('/rates/:id', ShippingController.updateRate);
router.delete('/rates/:id', ShippingController.deleteRate);

// Shipments (from orders)
router.get('/shipments', ShippingController.getShipments);
router.get('/stats', ShippingController.getStats);
router.patch('/shipments/:id/status', ShippingController.updateShipmentStatus);
router.patch('/shipments/:id/tracking', ShippingController.updateTracking);

export const ShippingRoutes = router;
