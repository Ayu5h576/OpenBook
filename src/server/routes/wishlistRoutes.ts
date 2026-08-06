import { Router } from 'express';
import { libraryController } from '../controllers/libraryController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler((req: any, res: any) => libraryController.getWishlist(req, res)));
router.post('/', asyncHandler((req: any, res: any) => libraryController.addToWishlist(req, res)));
router.delete('/:entryId', asyncHandler((req: any, res: any) => libraryController.removeFromWishlist(req, res)));

export default router;
