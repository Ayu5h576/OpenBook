import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError, AuthorizationError, mapPrismaError } from '../utils/errors';
import type { CreateCollectionInput, UpdateCollectionInput, ListQueryInput } from '../validators/books';

/**
 * How many covers the collections grid stacks on each card. The list endpoint
 * returns exactly this many books per collection — see getUserCollections.
 */
export const COLLECTION_PREVIEW_BOOKS = 6;

/**
 * Flattens Prisma's `_count` into a plain `bookCount`, so every collection
 * response carries its real size even where `books` is only a preview.
 *
 * `_count` is optional because the create/update queries that reuse this only
 * ever hold a freshly written row.
 */
function withBookCount<T extends { _count?: { books: number } }>(collection: T) {
  const { _count, ...rest } = collection;
  return { ...rest, bookCount: _count?.books ?? 0 };
}

/** Total order: `createdAt` is non-unique, so `id` anchors the cursor. */
const COLLECTION_ORDER: Prisma.CollectionOrderByWithRelationInput[] = [
  { createdAt: 'desc' },
  { id: 'desc' },
];

export class CollectionService {
  /**
   * One cursor-paginated page of collections, each with a bounded cover preview.
   *
   * `books` here is deliberately *not* the contents. The grid stacks six covers
   * per card and shows `bookCount` as the size, so joining every book of every
   * collection was an N×M read for rows that were never rendered. The full list
   * comes from getCollection.
   */
  async getUserCollections(userId: string, { limit, cursor }: ListQueryInput) {
    const where: Prisma.CollectionWhereInput = { userId };

    const [rows, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          books: {
            include: { book: true },
            orderBy: { sortOrder: 'asc' },
            take: COLLECTION_PREVIEW_BOOKS,
          },
          _count: { select: { books: true } },
        },
        orderBy: COLLECTION_ORDER,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      prisma.collection.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      collections: page.map(withBookCount),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      total,
    };
  }

  /** The full contents of one collection — the only endpoint that returns every book. */
  async getCollection(userId: string, collectionId: string) {
    const col = await prisma.collection.findFirst({
      where: { id: collectionId, userId },
      include: {
        books: { include: { book: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { books: true } },
      },
    });
    if (!col) throw new NotFoundError('Collection');
    return withBookCount(col);
  }

  async createCollection(userId: string, input: CreateCollectionInput) {
    const created = await prisma.collection.create({
      data: { userId, ...input } as any,
      include: { books: { include: { book: true } }, _count: { select: { books: true } } },
    });
    return withBookCount(created);
  }

  async updateCollection(userId: string, collectionId: string, input: UpdateCollectionInput) {
    await this.requireOwner(userId, collectionId);
    const updated = await prisma.collection.update({
      where: { id: collectionId },
      data: input,
      include: { books: { include: { book: true } }, _count: { select: { books: true } } },
    });
    return withBookCount(updated);
  }

  async deleteCollection(userId: string, collectionId: string) {
    await this.requireOwner(userId, collectionId);
    await prisma.collection.delete({ where: { id: collectionId } });
  }

  async addBook(userId: string, collectionId: string, bookId: string, sortOrder = 0) {
    await this.requireOwner(userId, collectionId);
    try {
      return await prisma.collectionBook.create({
        data: { collectionId, bookId, sortOrder },
        include: { book: true },
      });
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async removeBook(userId: string, collectionId: string, bookId: string) {
    await this.requireOwner(userId, collectionId);
    const entry = await prisma.collectionBook.findFirst({ where: { collectionId, bookId } });
    if (!entry) throw new NotFoundError('Book in collection');
    await prisma.collectionBook.delete({ where: { id: entry.id } });
  }

  private async requireOwner(userId: string, collectionId: string) {
    const col = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!col) throw new NotFoundError('Collection');
    if (col.userId !== userId) throw new AuthorizationError();
    return col;
  }
}

export const collectionService = new CollectionService();
