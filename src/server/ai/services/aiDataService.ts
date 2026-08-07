/**
 * AI Data Service - Fetches and Aggregates User Data for AI Context
 * Builds complete user profiles for personalized AI analysis
 */

import { prisma } from '../../config/prisma';

export class AIDataService {
  /**
   * Fetch complete user reading profile for AI analysis
   */
  async getUserReadingProfile(userId: string) {
    const [user, profile, entries, reviews, wishlist, collections, goals, quotes] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.profile.findUnique({ where: { id: userId } }),
      prisma.libraryEntry.findMany({
        where: { userId },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              authors: true,
              categories: true,
              pageCount: true,
              description: true,
              averageRating: true,
            },
          },
          readingSessions: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.findMany({
        where: { userId },
        include: { book: { select: { title: true, authors: true } } },
      }),
      prisma.wishlistEntry.findMany({
        where: { userId },
        include: { book: { select: { title: true, authors: true, categories: true } } },
      }),
      prisma.collection.findMany({
        where: { userId },
        include: {
          books: {
            include: { book: { select: { title: true, authors: true } } },
          },
        },
      }),
      prisma.readingGoal.findMany({ where: { userId } }),
      prisma.userQuote.findMany({ where: { userId } }),
    ]);

    if (!user || !profile) {
      throw new Error('User not found');
    }

    // Calculate statistics
    const completedBooks = entries.filter((e) => e.status === 'COMPLETED');
    const readingBooks = entries.filter((e) => e.status === 'READING');

    let totalPagesRead = 0;
    let totalReadingTime = 0; // in minutes
    entries.forEach((entry) => {
      entry.readingSessions.forEach((session) => {
        totalPagesRead += session.endPage - session.startPage;
        totalReadingTime += Math.floor(session.durationSecs / 60);
      });
    });

    const averageReadingSpeed = totalReadingTime > 0 ? Math.round(totalPagesRead / (totalReadingTime / 60)) : 0;

    // Genre distribution
    const genreMap: Record<string, number> = {};
    entries.forEach((entry) => {
      (entry.book.categories ?? []).forEach((genre) => {
        genreMap[genre] = (genreMap[genre] ?? 0) + 1;
      });
    });

    const favoriteGenres = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        username: profile.username,
        bio: profile.bio,
        favoriteGenres: profile.favoriteGenres,
      },
      statistics: {
        totalBooksRead: completedBooks.length,
        booksReading: readingBooks.length,
        totalPagesRead,
        totalReadingTime,
        averageReadingSpeed,
        averageRating: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length).toFixed(1) : 0,
      },
      readingHistory: entries.map((entry) => ({
        bookId: entry.id,
        title: entry.book.title,
        authors: entry.book.authors,
        status: entry.status,
        currentPage: entry.currentPage,
        pageCount: entry.book.pageCount,
        categories: entry.book.categories,
        rating: reviews.find((r) => r.bookId === entry.bookId)?.rating,
        isFavorite: entry.isFavorite,
      })),
      wishlist: wishlist.map((w) => ({
        bookId: w.bookId,
        title: w.book.title,
        authors: w.book.authors,
        priority: w.priority,
        categories: w.book.categories,
      })),
      collections: collections.map((c) => ({
        name: c.name,
        description: c.description,
        bookCount: c.books.length,
      })),
      favoriteGenres,
      currentReadingGoal: goals.find((g) => g.year === new Date().getFullYear()),
    };
  }

  /**
   * Fetch book details with user context (ratings, notes, progress)
   */
  async getBookWithUserContext(bookId: string, userId: string) {
    const [book, entry, reviews, notes, highlights, quotes] = await Promise.all([
      prisma.book.findUnique({ where: { id: bookId } }),
      prisma.libraryEntry.findFirst({
        where: { bookId, userId },
        include: { readingSessions: true },
      }),
      prisma.review.findMany({ where: { bookId } }),
      prisma.bookNote.findMany({ where: { entry: { bookId, userId } } }),
      prisma.bookHighlight.findMany({ where: { entry: { bookId, userId } } }),
      prisma.userQuote.findMany({ where: { bookId } }),
    ]);

    if (!book) {
      throw new Error('Book not found');
    }

    const userReview = reviews.find((r) => r.userId === userId);
    const communityRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length).toFixed(1) : 'N/A';

    return {
      id: book.id,
      title: book.title,
      authors: book.authors,
      description: book.description,
      pageCount: book.pageCount,
      categories: book.categories,
      coverImage: book.coverImage,
      userEntry: entry
        ? {
            status: entry.status,
            currentPage: entry.currentPage,
            progress: book.pageCount ? Math.round((entry.currentPage / book.pageCount) * 100) : 0,
            isFavorite: entry.isFavorite,
            startedAt: entry.startedAt,
            finishedAt: entry.finishedAt,
            readingSessions: entry.readingSessions.length,
          }
        : null,
      userReview: userReview
        ? {
            rating: userReview.rating,
            title: userReview.title,
            body: userReview.body,
          }
        : null,
      communityRating,
      userNotes: notes.length,
      userHighlights: highlights.length,
      topQuotes: quotes.slice(0, 3).map((q) => q.text),
    };
  }

  /**
   * Find similar readers based on reading patterns
   */
  async findSimilarReaders(userId: string, limit = 5) {
    const userProfile = await this.getUserReadingProfile(userId);
    const userGenres = userProfile.favoriteGenres;

    if (userGenres.length === 0) {
      return [];
    }

    // Find users who read similar genres
    const similarReaders = await prisma.libraryEntry.findMany({
      where: {
        userId: { not: userId },
        book: {
          categories: {
            hasSome: userGenres,
          },
        },
      },
      select: { userId: true },
      distinct: ['userId'],
      take: limit,
    });

    return similarReaders.map((r) => r.userId);
  }
}

export const aiDataService = new AIDataService();
