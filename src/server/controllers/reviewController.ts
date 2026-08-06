import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { reviewService } from '../services/reviewService';
import { validateData } from '../validators/auth';
import { upsertReviewSchema } from '../validators/books';
import { AuthenticationError } from '../utils/errors';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class ReviewController {
  async getBookReviews(req: AuthenticatedRequest, res: Response) {
    const reviews = await reviewService.getBookReviews(req.params.bookId);
    res.json({ reviews });
  }

  async getMyReview(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const review = await reviewService.getUserReview(userId, req.params.bookId);
    res.json({ review: review ?? null });
  }

  async upsertReview(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(upsertReviewSchema, req.body);
    const review = await reviewService.upsertReview(userId, req.params.bookId, input);
    res.json({ review });
  }

  async deleteReview(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    await reviewService.deleteReview(userId, req.params.bookId);
    res.json({ message: 'Review deleted' });
  }
}

export const reviewController = new ReviewController();
