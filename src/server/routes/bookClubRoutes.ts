import { Router } from 'express';
import { bookClubController } from '../controllers/bookClubController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.use(authMiddleware);

// Clubs
router.get('/', asyncHandler((req: any, res: any) => bookClubController.listClubs(req, res)));
router.post('/', asyncHandler((req: any, res: any) => bookClubController.createClub(req, res)));
router.get('/:clubId', asyncHandler((req: any, res: any) => bookClubController.getClub(req, res)));
router.put('/:clubId', asyncHandler((req: any, res: any) => bookClubController.updateClub(req, res)));
router.delete('/:clubId', asyncHandler((req: any, res: any) => bookClubController.deleteClub(req, res)));

// Membership
router.post('/:clubId/join', asyncHandler((req: any, res: any) => bookClubController.joinClub(req, res)));
router.delete('/:clubId/leave', asyncHandler((req: any, res: any) => bookClubController.leaveClub(req, res)));

// Discussions
router.get('/:clubId/discussions', asyncHandler((req: any, res: any) => bookClubController.listDiscussions(req, res)));
router.post('/:clubId/discussions', asyncHandler((req: any, res: any) => bookClubController.createDiscussion(req, res)));
router.get('/:clubId/discussions/:discussionId', asyncHandler((req: any, res: any) => bookClubController.getDiscussion(req, res)));
router.post('/:clubId/discussions/:discussionId/comments', asyncHandler((req: any, res: any) => bookClubController.addComment(req, res)));

export default router;
