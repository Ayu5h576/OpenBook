import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler((req: any, res: any) => analyticsController.getStats(req, res)));
// Live stats. Safe under asyncHandler because streamStats only rejects before it
// flushes headers — after that it handles its own errors, since the global error
// middleware answers with res.json() and would throw on a streaming response.
router.get('/stream', asyncHandler((req: any, res: any) => analyticsController.streamStats(req, res)));
router.get('/goal', asyncHandler((req: any, res: any) => analyticsController.getGoal(req, res)));
router.post('/goal', asyncHandler((req: any, res: any) => analyticsController.upsertGoal(req, res)));

export default router;
