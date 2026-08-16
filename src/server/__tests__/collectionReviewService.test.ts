/**
 * CollectionService + ReviewService — unit tests
 *
 * Prisma is mocked. Both services are mostly CRUD, so the focus is the
 * ownership checks (a collection must never be mutated by a non-owner) and the
 * once-per-review feed event.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollectionService } from '../services/collectionService';
import { ReviewService } from '../services/reviewService';
import { AuthorizationError, NotFoundError } from '../utils/errors';

vi.mock('../config/prisma', () => ({
  prisma: {
    collection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    collectionBook: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    review: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    book: { findUnique: vi.fn() },
    activity: { create: vi.fn() },
  },
}));

import { prisma } from '../config/prisma';

const collections = new CollectionService();
const reviews = new ReviewService();

const OWNER = 'user-1';
const INTRUDER = 'user-2';
const COLLECTION = 'col-1';
const BOOK = 'book-1';

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.activity.create as any).mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// CollectionService — ownership
// ---------------------------------------------------------------------------
describe('CollectionService ownership', () => {
  it('scopes collection reads to the caller', async () => {
    (prisma.collection.findFirst as any).mockResolvedValue({ id: COLLECTION, userId: OWNER });

    await collections.getCollection(OWNER, COLLECTION);

    expect(prisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: COLLECTION, userId: OWNER } })
    );
  });

  it('throws NotFoundError rather than leaking another user\'s collection', async () => {
    (prisma.collection.findFirst as any).mockResolvedValue(null);

    await expect(collections.getCollection(INTRUDER, COLLECTION)).rejects.toThrow(NotFoundError);
  });

  it.each([
    ['updateCollection', () => collections.updateCollection(INTRUDER, COLLECTION, { name: 'x' } as any)],
    ['deleteCollection', () => collections.deleteCollection(INTRUDER, COLLECTION)],
    ['addBook', () => collections.addBook(INTRUDER, COLLECTION, BOOK)],
    ['removeBook', () => collections.removeBook(INTRUDER, COLLECTION, BOOK)],
  ])('rejects %s from a non-owner', async (_name, call) => {
    (prisma.collection.findUnique as any).mockResolvedValue({ id: COLLECTION, userId: OWNER });

    await expect(call()).rejects.toThrow(AuthorizationError);
    expect(prisma.collection.update).not.toHaveBeenCalled();
    expect(prisma.collection.delete).not.toHaveBeenCalled();
    expect(prisma.collectionBook.create).not.toHaveBeenCalled();
    expect(prisma.collectionBook.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['updateCollection', () => collections.updateCollection(OWNER, COLLECTION, { name: 'x' } as any)],
    ['deleteCollection', () => collections.deleteCollection(OWNER, COLLECTION)],
  ])('throws NotFoundError from %s when the collection is gone', async (_name, call) => {
    (prisma.collection.findUnique as any).mockResolvedValue(null);

    await expect(call()).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// CollectionService — CRUD
// ---------------------------------------------------------------------------
describe('CollectionService CRUD', () => {
  it('creates a collection owned by the caller', async () => {
    (prisma.collection.create as any).mockResolvedValue({ id: COLLECTION });

    await collections.createCollection(OWNER, { name: 'Favourites' } as any);

    expect(prisma.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: OWNER, name: 'Favourites' }) })
    );
  });

  it('lists a user\'s collections with their books sorted by sortOrder', async () => {
    (prisma.collection.findMany as any).mockResolvedValue([]);

    await collections.getUserCollections(OWNER);

    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: OWNER },
        include: { books: { include: { book: true }, orderBy: { sortOrder: 'asc' } } },
      })
    );
  });

  it('adds a book for the owner', async () => {
    (prisma.collection.findUnique as any).mockResolvedValue({ id: COLLECTION, userId: OWNER });
    (prisma.collectionBook.create as any).mockResolvedValue({ id: 'cb-1' });

    await collections.addBook(OWNER, COLLECTION, BOOK, 3);

    expect(prisma.collectionBook.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { collectionId: COLLECTION, bookId: BOOK, sortOrder: 3 } })
    );
  });

  it('throws NotFoundError when removing a book that is not in the collection', async () => {
    (prisma.collection.findUnique as any).mockResolvedValue({ id: COLLECTION, userId: OWNER });
    (prisma.collectionBook.findFirst as any).mockResolvedValue(null);

    await expect(collections.removeBook(OWNER, COLLECTION, BOOK)).rejects.toThrow(NotFoundError);
  });

  it('removes a book that is in the collection', async () => {
    (prisma.collection.findUnique as any).mockResolvedValue({ id: COLLECTION, userId: OWNER });
    (prisma.collectionBook.findFirst as any).mockResolvedValue({ id: 'cb-1' });

    await collections.removeBook(OWNER, COLLECTION, BOOK);

    expect(prisma.collectionBook.delete).toHaveBeenCalledWith({ where: { id: 'cb-1' } });
  });
});

// ---------------------------------------------------------------------------
// ReviewService
// ---------------------------------------------------------------------------
describe('ReviewService', () => {
  it('exposes only public reviews for a book', async () => {
    (prisma.review.findMany as any).mockResolvedValue([]);

    await reviews.getBookReviews(BOOK);

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bookId: BOOK, isPrivate: false } })
    );
  });

  it('announces a first-time public review to the feed', async () => {
    (prisma.review.findUnique as any).mockResolvedValue(null); // no existing review
    (prisma.review.upsert as any).mockResolvedValue({ id: 'rev-1' });
    (prisma.book.findUnique as any).mockResolvedValue({ title: 'Dune', authors: ['Herbert'] });

    await reviews.upsertReview(OWNER, BOOK, { rating: 5, isPrivate: false } as any);

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: OWNER,
        type: 'WROTE_REVIEW',
        bookId: BOOK,
        metadata: { bookTitle: 'Dune', authors: ['Herbert'], rating: 5 },
      }),
    });
  });

  it('stays quiet when editing an existing review', async () => {
    (prisma.review.findUnique as any).mockResolvedValue({ id: 'rev-1' });
    (prisma.review.upsert as any).mockResolvedValue({ id: 'rev-1' });

    await reviews.upsertReview(OWNER, BOOK, { rating: 4, isPrivate: false } as any);

    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it('does not announce a private review', async () => {
    (prisma.review.findUnique as any).mockResolvedValue(null);
    (prisma.review.upsert as any).mockResolvedValue({ id: 'rev-1' });

    await reviews.upsertReview(OWNER, BOOK, { rating: 5, isPrivate: true } as any);

    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it('falls back gracefully when the book row is missing', async () => {
    (prisma.review.findUnique as any).mockResolvedValue(null);
    (prisma.review.upsert as any).mockResolvedValue({ id: 'rev-1' });
    (prisma.book.findUnique as any).mockResolvedValue(null);

    await reviews.upsertReview(OWNER, BOOK, { rating: 3, isPrivate: false } as any);

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({ bookTitle: 'a book', authors: [] }),
      }),
    });
  });

  it('throws NotFoundError when deleting a review that does not exist', async () => {
    (prisma.review.findUnique as any).mockResolvedValue(null);

    await expect(reviews.deleteReview(OWNER, BOOK)).rejects.toThrow(NotFoundError);
    expect(prisma.review.delete).not.toHaveBeenCalled();
  });

  it('deletes the caller\'s own review', async () => {
    (prisma.review.findUnique as any).mockResolvedValue({ id: 'rev-1' });

    await reviews.deleteReview(OWNER, BOOK);

    expect(prisma.review.delete).toHaveBeenCalledWith({
      where: { userId_bookId: { userId: OWNER, bookId: BOOK } },
    });
  });
});
