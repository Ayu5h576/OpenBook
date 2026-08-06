import { Router } from 'express';
import { reviewController } from '../controllers/reviewController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler((req: any, res: any) => reviewController.getBookReviews(req, res)));
router.get('/mine', authMiddleware, asyncHandler((req: any, res: any) => reviewController.getMyReview(req, res)));
router.put('/', authMiddleware, asyncHandler((req: any, res: any) => reviewController.upsertReview(req, res)));
router.delete('/', authMiddleware, asyncHandler((req: any, res: any) => reviewController.deleteReview(req, res)));

export default router;
