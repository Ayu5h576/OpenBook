import { Router } from 'express';
import { socialController } from '../controllers/socialController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.use(authMiddleware);

// Activity feed for the authenticated user (scope: following | me | global)
router.get('/feed', asyncHandler((req: any, res: any) => socialController.getFeed(req, res)));

// The caller's own social graph
router.get('/stats', asyncHandler((req: any, res: any) => socialController.getStats(req, res)));
router.get('/followers', asyncHandler((req: any, res: any) => socialController.getFollowers(req, res)));
router.get('/following', asyncHandler((req: any, res: any) => socialController.getFollowing(req, res)));

// Another user's social graph
router.get('/:userId/stats', asyncHandler((req: any, res: any) => socialController.getStats(req, res)));
router.get('/:userId/followers', asyncHandler((req: any, res: any) => socialController.getFollowers(req, res)));
router.get('/:userId/following', asyncHandler((req: any, res: any) => socialController.getFollowing(req, res)));

// Follow / unfollow
router.post('/:userId/follow', asyncHandler((req: any, res: any) => socialController.follow(req, res)));
router.delete('/:userId/follow', asyncHandler((req: any, res: any) => socialController.unfollow(req, res)));

export default router;
