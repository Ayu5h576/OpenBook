import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { bookService } from '../services/bookService';
import { priceService } from '../services/priceService';
import { bookMediaService } from '../services/bookMediaService';
import { validateData } from '../validators/auth';
import { searchBooksSchema, importBookSchema, offersQuerySchema } from '../validators/books';
import { AuthenticationError } from '../utils/errors';

export class BookController {
  async search(req: AuthenticatedRequest, res: Response) {
    const input = validateData(searchBooksSchema, req.query);
    const result = await bookService.searchBooks(input.q, input.type, input.page * input.limit, input.limit);
    res.json(result);
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const book = await bookService.getBookById(req.params.id);
    res.json({ book });
  }

  async importBook(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) throw new AuthenticationError();
    const { googleBooksId } = validateData(importBookSchema, req.body);
    const book = await bookService.importBook(googleBooksId);
    res.status(201).json({ book });
  }

  /** Purchase offers across storefronts, ranked cheapest-first. */
  async getOffers(req: AuthenticatedRequest, res: Response) {
    const { region } = validateData(offersQuerySchema, req.query);
    const book = await bookService.getBookById(req.params.id);
    const result = await priceService.getOffers(book, region);
    res.json(result);
  }

  /** Collage images (edition covers + author portrait) for the scrapbook page. */
  async getMedia(req: AuthenticatedRequest, res: Response) {
    const book = await bookService.getBookById(req.params.id);
    const result = await bookMediaService.getBookMedia(book);
    res.json(result);
  }
}

export const bookController = new BookController();
