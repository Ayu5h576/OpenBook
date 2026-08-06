import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler((req: any, res: any) => analyticsController.getStats(req, res)));
router.get('/goal', asyncHandler((req: any, res: any) => analyticsController.getGoal(req, res)));
router.post('/goal', asyncHandler((req: any, res: any) => analyticsController.upsertGoal(req, res)));

export default router;
