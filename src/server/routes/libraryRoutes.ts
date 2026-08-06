import { Router } from 'express';
import { libraryController } from '../controllers/libraryController';
import { noteController } from '../controllers/noteController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

// All library routes require auth
router.use(authMiddleware);

// Library
router.get('/', asyncHandler((req: any, res: any) => libraryController.getLibrary(req, res)));
router.post('/', asyncHandler((req: any, res: any) => libraryController.addToLibrary(req, res)));
router.get('/:entryId', asyncHandler((req: any, res: any) => libraryController.getEntry(req, res)));
router.put('/:entryId', asyncHandler((req: any, res: any) => libraryController.updateEntry(req, res)));
router.delete('/:entryId', asyncHandler((req: any, res: any) => libraryController.removeFromLibrary(req, res)));

// Reading sessions
router.post('/:entryId/sessions', asyncHandler((req: any, res: any) => libraryController.logSession(req, res)));

// Notes
router.get('/:entryId/notes', asyncHandler((req: any, res: any) => noteController.getNotes(req, res)));
router.post('/:entryId/notes', asyncHandler((req: any, res: any) => noteController.createNote(req, res)));
router.put('/:entryId/notes/:noteId', asyncHandler((req: any, res: any) => noteController.updateNote(req, res)));
router.delete('/:entryId/notes/:noteId', asyncHandler((req: any, res: any) => noteController.deleteNote(req, res)));

// Highlights
router.get('/:entryId/highlights', asyncHandler((req: any, res: any) => noteController.getHighlights(req, res)));
router.post('/:entryId/highlights', asyncHandler((req: any, res: any) => noteController.createHighlight(req, res)));
router.delete('/:entryId/highlights/:highlightId', asyncHandler((req: any, res: any) => noteController.deleteHighlight(req, res)));

export default router;
