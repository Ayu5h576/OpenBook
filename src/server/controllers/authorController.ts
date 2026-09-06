import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { authorService } from '../services/authorService';
import { NotFoundError } from '../utils/errors';

export class AuthorController {
  /**
   * The author page's data, in one request.
   *
   * `:name` is the author's name, percent-encoded. Legacy `auth-<uuid>` links
   * (a book id wearing an author prefix, minted before authors were identified
   * by name) are resolved through the book they point at, so old links keep
   * working.
   *
   * Auth is optional: signed out, the page still shows who the author is and
   * what they wrote — there is simply no reading history to report.
   */
  async getProfile(req: AuthenticatedRequest, res: Response) {
    const name = await authorService.resolveAuthorName(req.params.name);
    if (!name) throw new NotFoundError('Author');

    const profile = await authorService.getProfile(name, req.userId);
    res.json(profile);
  }
}

export const authorController = new AuthorController();
