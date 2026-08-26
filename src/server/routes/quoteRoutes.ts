import { Router } from 'express';
import { quoteController } from '../controllers/quoteController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

// Quotes are private to their owner, so every route needs a caller.
router.use(authMiddleware);

// Declared before the `/:quoteId` routes: Express matches in order, so a param
// route registered first would capture `categories` as an id — the same trap
// socialRoutes documents for `/search` and `/suggested`.
router.get('/categories', asyncHandler((req: any, res: any) => quoteController.categories(req, res)));

router.get('/', asyncHandler((req: any, res: any) => quoteController.list(req, res)));
router.post('/', asyncHandler((req: any, res: any) => quoteController.create(req, res)));
router.put('/:quoteId', asyncHandler((req: any, res: any) => quoteController.update(req, res)));
router.delete('/:quoteId', asyncHandler((req: any, res: any) => quoteController.remove(req, res)));

export default router;
