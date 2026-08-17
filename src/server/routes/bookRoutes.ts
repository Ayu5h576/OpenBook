import { Router } from 'express';
import { bookController } from '../controllers/bookController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.get('/search', asyncHandler((req: any, res: any) => bookController.search(req, res)));
router.get('/:id/offers', asyncHandler((req: any, res: any) => bookController.getOffers(req, res)));
router.get('/:id/media', asyncHandler((req: any, res: any) => bookController.getMedia(req, res)));
router.get('/:id', asyncHandler((req: any, res: any) => bookController.getById(req, res)));
router.post('/import', authMiddleware, asyncHandler((req: any, res: any) => bookController.importBook(req, res)));

export default router;
