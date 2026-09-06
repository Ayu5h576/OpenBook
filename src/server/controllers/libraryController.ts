import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { libraryService } from '../services/libraryService';
import { validateData } from '../validators/auth';
import {
  addToLibrarySchema,
  updateLibraryEntrySchema,
  logSessionSchema,
  addToWishlistSchema,
  libraryQuerySchema,
  wishlistQuerySchema,
  listQuerySchema,
} from '../validators/books';
import { AuthenticationError } from '../utils/errors';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class LibraryController {
  /**
   * Responds `{ entries, nextCursor, total }`.
   *
   * `status` used to be read straight off `req.query` and cast to LibraryStatus,
   * which handed an unknown value to Prisma and surfaced as a 500; validating it
   * makes that a 400.
   */
  async getLibrary(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const query = validateData(libraryQuerySchema, req.query);
    res.json(await libraryService.getUserLibrary(userId, query));
  }

  async getEntry(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const entry = await libraryService.getEntry(userId, req.params.entryId);
    res.json({ entry });
  }

  /** Resolves the caller's LibraryEntry for a book id — `{ entry: null }` when the book is not in their library. */
  async resolveEntry(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const entry = await libraryService.getEntryByBook(userId, req.params.bookId);
    res.json({ entry });
  }

  /** Responds `{ memories, nextCursor, total }` for the finished shelf. */
  async getMemories(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const query = validateData(listQuerySchema, req.query);
    res.json(await libraryService.getMemories(userId, query));
  }

  async addToLibrary(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(addToLibrarySchema, req.body);
    const entry = await libraryService.addToLibrary(userId, input);
    res.status(201).json({ entry });
  }

  async updateEntry(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(updateLibraryEntrySchema, req.body);
    const entry = await libraryService.updateEntry(userId, req.params.entryId, input);
    res.json({ entry });
  }

  async removeFromLibrary(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    await libraryService.removeFromLibrary(userId, req.params.entryId);
    res.json({ message: 'Removed from library' });
  }

  async logSession(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(logSessionSchema, req.body);
    const session = await libraryService.logSession(userId, req.params.entryId, input);
    res.status(201).json({ session });
  }

  async getWishlist(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const query = validateData(wishlistQuerySchema, req.query);
    res.json(await libraryService.getWishlist(userId, query));
  }

  async addToWishlist(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(addToWishlistSchema, req.body);
    const entry = await libraryService.addToWishlist(userId, input.bookId, input.priority, input.notes ?? undefined);
    res.status(201).json({ entry });
  }

  async removeFromWishlist(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    await libraryService.removeFromWishlist(userId, req.params.entryId);
    res.json({ message: 'Removed from wishlist' });
  }
}

export const libraryController = new LibraryController();
