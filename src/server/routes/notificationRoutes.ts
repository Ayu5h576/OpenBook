import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler((req: any, res: any) => notificationController.list(req, res)));

// Declared before /:id so the literal segment is never captured as an id.
router.get('/unread-count', asyncHandler((req: any, res: any) => notificationController.unreadCount(req, res)));
router.post('/read-all', asyncHandler((req: any, res: any) => notificationController.markAllRead(req, res)));

router.post('/:id/read', asyncHandler((req: any, res: any) => notificationController.markRead(req, res)));

export default router;
