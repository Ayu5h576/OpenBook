import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { libraryService } from '../services/libraryService';
import { validateData } from '../validators/auth';
import {
  addToLibrarySchema,
  updateLibraryEntrySchema,
  logSessionSchema,
  addToWishlistSchema,
} from '../validators/books';
import { AuthenticationError } from '../utils/errors';
import { LibraryStatus } from '@prisma/client';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class LibraryController {
  async getLibrary(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const status = req.query.status as LibraryStatus | undefined;
    const entries = await libraryService.getUserLibrary(userId, status);
    res.json({ entries });
  }

  async getEntry(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const entry = await libraryService.getEntry(userId, req.params.entryId);
    res.json({ entry });
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
    const entries = await libraryService.getWishlist(userId);
    res.json({ entries });
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
