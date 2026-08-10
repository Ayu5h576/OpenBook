import { Router } from 'express';
import { achievementController } from '../controllers/bookClubController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler((req: any, res: any) => achievementController.getAchievements(req, res)));

export default router;
