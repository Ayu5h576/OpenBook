import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { quoteService } from '../services/quoteService';
import { validateData } from '../validators/auth';
import { quoteQuerySchema, createQuoteSchema, updateQuoteSchema } from '../validators/books';
import { AuthenticationError } from '../utils/errors';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class QuoteController {
  /** Responds `{ quotes, nextCursor, total }`. */
  async list(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    // The schema keeps `favorite` as the literal query string; convert here so the
    // service works with a real boolean. Absent stays undefined, which means
    // "either" rather than "not favourited".
    const { limit, cursor, category, favorite, bookId } = validateData(quoteQuerySchema, req.query);
    res.json(
      await quoteService.getQuotes(userId, {
        limit,
        cursor,
        category,
        bookId,
        favorite: favorite === undefined ? undefined : favorite === 'true',
      })
    );
  }

  async categories(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    res.json({ categories: await quoteService.getCategories(userId) });
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(createQuoteSchema, req.body);
    const quote = await quoteService.createQuote(userId, input);
    res.status(201).json({ quote });
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(updateQuoteSchema, req.body);
    const quote = await quoteService.updateQuote(userId, req.params.quoteId, input);
    res.json({ quote });
  }

  async remove(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    await quoteService.deleteQuote(userId, req.params.quoteId);
    res.json({ message: 'Quote deleted' });
  }
}

export const quoteController = new QuoteController();
