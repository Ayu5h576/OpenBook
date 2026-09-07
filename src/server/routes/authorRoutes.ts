import { Router } from 'express';
import { authorController } from '../controllers/authorController';
import { optionalAuthMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

// Optional auth: the biography and bibliography are public, the reading history
// and shelf-based related authors only appear for a signed-in reader.
router.get(
  '/:name',
  optionalAuthMiddleware,
  asyncHandler((req: any, res: any) => authorController.getProfile(req, res))
);

export default router;
