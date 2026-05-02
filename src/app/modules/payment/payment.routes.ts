import express from 'express';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import PaymentController from './payment.controller';

const router = express.Router();

// All payment routes require admin auth
router.use(authMiddleware, authorizeRoles('admin'));

router.get('/admin/all', PaymentController.getAll);
router.get('/admin/stats', PaymentController.getStats);
router.patch('/admin/:id/cod-paid', PaymentController.markCODPaid);
router.post('/admin/:id/refund', PaymentController.refundPayment);

export const PaymentRoutes = router;
