import { prisma } from '../config/prisma';
import { NotFoundError, AuthorizationError, mapPrismaError } from '../utils/errors';
import type { CreateCollectionInput, UpdateCollectionInput } from '../validators/books';

export class CollectionService {
  async getUserCollections(userId: string) {
    return prisma.collection.findMany({
      where: { userId },
      include: {
        books: {
          include: { book: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCollection(userId: string, collectionId: string) {
    const col = await prisma.collection.findFirst({
      where: { id: collectionId, userId },
      include: {
        books: { include: { book: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!col) throw new NotFoundError('Collection');
    return col;
  }

  async createCollection(userId: string, input: CreateCollectionInput) {
    return prisma.collection.create({
      data: { userId, ...input } as any,
      include: { books: { include: { book: true } } },
    });
  }

  async updateCollection(userId: string, collectionId: string, input: UpdateCollectionInput) {
    await this.requireOwner(userId, collectionId);
    return prisma.collection.update({
      where: { id: collectionId },
      data: input,
      include: { books: { include: { book: true } } },
    });
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
