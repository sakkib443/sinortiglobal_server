import express from 'express';
import OrderController from './order.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createOrderValidation, updateOrderStatusValidation } from './order.validation';

const router = express.Router();

// ── Guest checkout (no auth required) ────────────
router.post('/guest-checkout', OrderController.guestCheckout);

// ── User routes ──────────────────────────────────
router.get('/my', authMiddleware, OrderController.getMyOrders);
router.post('/', authMiddleware, validateRequest(createOrderValidation), OrderController.create);
router.patch('/:id/cancel', authMiddleware, OrderController.cancel);

// ── Admin routes ─────────────────────────────────
router.get('/admin/all', authMiddleware, authorizeRoles('admin'), OrderController.getAll);
router.get('/admin/stats', authMiddleware, authorizeRoles('admin'), OrderController.getStats);
router.get('/admin/:id', authMiddleware, authorizeRoles('admin'), OrderController.getById);
router.patch('/admin/:id/status', authMiddleware, authorizeRoles('admin'), validateRequest(updateOrderStatusValidation), OrderController.updateStatus);
router.patch('/admin/:id/payment', authMiddleware, authorizeRoles('admin'), OrderController.updatePaymentStatus);
router.patch('/admin/:id/note', authMiddleware, authorizeRoles('admin'), OrderController.addNote);

// ── Legacy/general ───────────────────────────────
router.get('/:id', authMiddleware, OrderController.getById);

export const OrderRoutes = router;
