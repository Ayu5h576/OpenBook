import { prisma } from '../config/prisma';
import { NotFoundError, mapPrismaError } from '../utils/errors';
import { recordActivity } from './socialService';
import type { UpsertReviewInput } from '../validators/books';

export class ReviewService {
  async getBookReviews(bookId: string) {
    return prisma.review.findMany({
      where: { bookId, isPrivate: false },
      include: { user: { include: { profile: { select: { username: true, avatar: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserReview(userId: string, bookId: string) {
    return prisma.review.findUnique({ where: { userId_bookId: { userId, bookId } } });
  }

  async upsertReview(userId: string, bookId: string, input: UpsertReviewInput) {
    try {
      // Detect first-time creation before upserting so the feed event fires once
      // per review, not on every subsequent edit.
      const existing = await prisma.review.findUnique({
        where: { userId_bookId: { userId, bookId } },
        select: { id: true },
      });

      const review = await prisma.review.upsert({
        where: { userId_bookId: { userId, bookId } },
        create: { userId, bookId, ...input } as any,
        update: input,
      });

      if (!existing && !input.isPrivate) {
        const book = await prisma.book.findUnique({
          where: { id: bookId },
          select: { title: true, authors: true },
        });
        await recordActivity(userId, 'WROTE_REVIEW', {
          bookId,
          metadata: {
            bookTitle: book?.title ?? 'a book',
            authors: book?.authors ?? [],
            rating: Number(input.rating),
          },
        });
      }

      return review;
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async deleteReview(userId: string, bookId: string) {
    const review = await prisma.review.findUnique({ where: { userId_bookId: { userId, bookId } } });
    if (!review) throw new NotFoundError('Review');
    await prisma.review.delete({ where: { userId_bookId: { userId, bookId } } });
  }
}

export const reviewService = new ReviewService();
