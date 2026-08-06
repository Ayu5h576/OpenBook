import { Router } from 'express';
import { collectionController } from '../controllers/collectionController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler((req: any, res: any) => collectionController.getCollections(req, res)));
router.post('/', asyncHandler((req: any, res: any) => collectionController.createCollection(req, res)));
router.get('/:id', asyncHandler((req: any, res: any) => collectionController.getCollection(req, res)));
router.put('/:id', asyncHandler((req: any, res: any) => collectionController.updateCollection(req, res)));
router.delete('/:id', asyncHandler((req: any, res: any) => collectionController.deleteCollection(req, res)));
router.post('/:id/books', asyncHandler((req: any, res: any) => collectionController.addBook(req, res)));
router.delete('/:id/books/:bookId', asyncHandler((req: any, res: any) => collectionController.removeBook(req, res)));

export default router;
