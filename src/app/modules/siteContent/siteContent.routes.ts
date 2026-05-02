import express from 'express';
import SiteContentController from './siteContent.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';

const router = express.Router();

// Public — anyone can fetch site content
router.get('/', SiteContentController.get);

// Admin — full update
router.put('/', authMiddleware, authorizeRoles('admin'), SiteContentController.update);

// Admin — update specific section
router.patch('/:section', authMiddleware, authorizeRoles('admin'), SiteContentController.updateSection);

export const SiteContentRoutes = router;
