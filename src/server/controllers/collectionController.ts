import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { collectionService } from '../services/collectionService';
import { validateData } from '../validators/auth';
import { createCollectionSchema, updateCollectionSchema, addToCollectionSchema } from '../validators/books';
import { AuthenticationError } from '../utils/errors';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class CollectionController {
  async getCollections(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const collections = await collectionService.getUserCollections(userId);
    res.json({ collections });
  }

  async getCollection(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const collection = await collectionService.getCollection(userId, req.params.id);
    res.json({ collection });
  }

  async createCollection(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(createCollectionSchema, req.body);
    const collection = await collectionService.createCollection(userId, input);
    res.status(201).json({ collection });
  }

  async updateCollection(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(updateCollectionSchema, req.body);
    const collection = await collectionService.updateCollection(userId, req.params.id, input);
    res.json({ collection });
  }

  async deleteCollection(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    await collectionService.deleteCollection(userId, req.params.id);
    res.json({ message: 'Collection deleted' });
  }

  async addBook(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(addToCollectionSchema, req.body);
    const entry = await collectionService.addBook(userId, req.params.id, input.bookId, input.sortOrder);
    res.status(201).json({ entry });
  }

  async removeBook(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    await collectionService.removeBook(userId, req.params.id, req.params.bookId);
    res.json({ message: 'Book removed from collection' });
  }
}

export const collectionController = new CollectionController();
