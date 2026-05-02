import express from 'express';
import SearchController from './search.controller';

const router = express.Router();

// POST /api/search/image — Image search (public, no auth required)
router.post('/image', SearchController.searchByImage);

export const SearchRoutes = router;
