import express from 'express';
import InquiryController from './inquiry.controller';
import { authMiddleware, authorizeRoles, optionalAuth } from '../../middlewares/auth';

const router = express.Router();

// Public routes — optionalAuth links the inquiry to the user if they are logged in
router.post('/', optionalAuth, InquiryController.create);
router.get('/product/:productId', InquiryController.getByProduct);

// Logged-in customer: their own inquiries / RFQs (+ admin quotes)
router.get('/my', authMiddleware, InquiryController.getMy);

// Admin routes
router.get('/', authMiddleware, authorizeRoles('admin'), InquiryController.getAll);
router.patch('/:id', authMiddleware, authorizeRoles('admin'), InquiryController.updateStatus);
router.delete('/:id', authMiddleware, authorizeRoles('admin'), InquiryController.delete);

export const InquiryRoutes = router;
