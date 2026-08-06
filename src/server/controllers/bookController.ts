import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { bookService } from '../services/bookService';
import { validateData } from '../validators/auth';
import { searchBooksSchema, importBookSchema } from '../validators/books';
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
}

export const bookController = new BookController();
