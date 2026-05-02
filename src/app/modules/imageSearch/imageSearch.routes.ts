import express from 'express';
import ImageSearchController from './imageSearch.controller';

const router = express.Router();

// POST /api/search/image — search products by analyzed image data
router.post('/', ImageSearchController.searchByImage);

export const ImageSearchRoutes = router;
