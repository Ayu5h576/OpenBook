/**
 * LibraryService — unit tests
 *
 * Prisma is mocked. All business logic (status transitions, page tracking,
 * conflict detection) is exercised without a real database.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryService } from '../services/libraryService';
import { ConflictError, NotFoundError } from '../utils/errors';

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
vi.mock('../config/prisma', () => ({
  prisma: {
    libraryEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    wishlistEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    readingSession: {
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
  },
}));

// Mock recordActivity so LibraryService doesn't need socialService wired up
vi.mock('../services/socialService', () => ({
  recordActivity: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../config/prisma';

// ---------------------------------------------------------------------------
// Fake data
// ---------------------------------------------------------------------------
const FAKE_BOOK = {
  id: 'book-1',
  title: 'The Great Gatsby',
  authors: ['F. Scott Fitzgerald'],
  pageCount: 180,
  categories: ['Classic Fiction'],
};

function fakeEntry(overrides: Record<string, any> = {}) {
  return {
    id: 'entry-1',
    userId: 'user-1',
    bookId: 'book-1',
    status: 'READING',
    currentPage: 0,
    isPinned: false,
    startedAt: null,
    finishedAt: null,
    lastReadAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    book: FAKE_BOOK,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('LibraryService', () => {
  let service: LibraryService;

  beforeEach(() => {
    service = new LibraryService();
    vi.clearAllMocks();
  });

  // ---- getUserLibrary ------------------------------------------------------
  describe('getUserLibrary', () => {
    it('returns all entries for a user', async () => {
      const entries = [fakeEntry(), fakeEntry({ id: 'entry-2' })];
      vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue(entries as any);

      const result = await service.getUserLibrary('user-1');
      expect(result).toHaveLength(2);
      expect(prisma.libraryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
    });

    it('filters by status when provided', async () => {
      vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue([]);

      await service.getUserLibrary('user-1', 'COMPLETED' as any);
      expect(prisma.libraryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', status: 'COMPLETED' } })
      );
    });
  });

  // ---- addToLibrary --------------------------------------------------------
  describe('addToLibrary', () => {
    it('creates a new library entry', async () => {
      vi.mocked(prisma.libraryEntry.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.libraryEntry.create).mockResolvedValue(fakeEntry() as any);

      const result = await service.addToLibrary('user-1', { bookId: 'book-1', status: 'READING' });
      expect(prisma.libraryEntry.create).toHaveBeenCalledOnce();
      expect(result.bookId).toBe('book-1');
    });

    it('sets startedAt when adding with READING status', async () => {
      vi.mocked(prisma.libraryEntry.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.libraryEntry.create).mockResolvedValue(fakeEntry() as any);

      await service.addToLibrary('user-1', { bookId: 'book-1', status: 'READING' });
      expect(prisma.libraryEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ startedAt: expect.any(Date) }),
        })
      );
    });

    it('throws ConflictError when book is already in the library', async () => {
      vi.mocked(prisma.libraryEntry.findUnique).mockResolvedValue(fakeEntry() as any);

      await expect(
        service.addToLibrary('user-1', { bookId: 'book-1', status: 'READING' })
      ).rejects.toBeInstanceOf(ConflictError);
      expect(prisma.libraryEntry.create).not.toHaveBeenCalled();
    });
  });

  // ---- updateEntry ---------------------------------------------------------
  describe('updateEntry', () => {
    it('sets startedAt when transitioning to READING', async () => {
      const existing = fakeEntry({ status: 'OWNED', startedAt: null });
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.libraryEntry.update).mockResolvedValue(fakeEntry({ status: 'READING' }) as any);

      await service.updateEntry('user-1', 'entry-1', { status: 'READING' as any });

      expect(prisma.libraryEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ startedAt: expect.any(Date) }),
        })
      );
    });

    it('sets finishedAt when transitioning to COMPLETED', async () => {
      const existing = fakeEntry({ status: 'READING', startedAt: new Date() });
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.libraryEntry.update).mockResolvedValue(
        fakeEntry({ status: 'COMPLETED', finishedAt: new Date() }) as any
      );

      await service.updateEntry('user-1', 'entry-1', { status: 'COMPLETED' as any });

      expect(prisma.libraryEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ finishedAt: expect.any(Date) }),
        })
      );
    });

    it('throws NotFoundError when entry does not belong to user', async () => {
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);

      await expect(
        service.updateEntry('user-1', 'ghost-entry', { status: 'COMPLETED' as any })
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ---- logSession ----------------------------------------------------------
  describe('logSession', () => {
    it('creates a session and advances currentPage', async () => {
      const existing = fakeEntry({ currentPage: 50 });
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.readingSession.create).mockResolvedValue({ id: 'session-1' } as any);
      vi.mocked(prisma.libraryEntry.update).mockResolvedValue(fakeEntry({ currentPage: 80 }) as any);
      vi.mocked(prisma.$transaction).mockImplementation((ops: any) => {
        if (Array.isArray(ops)) return Promise.all(ops);
        return ops(prisma);
      });

      const input = {
        startPage: 50,
        endPage: 80,
        durationSecs: 1800,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };
      const session = await service.logSession('user-1', 'entry-1', input);

      expect(prisma.readingSession.create).toHaveBeenCalledOnce();
      expect(prisma.libraryEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentPage: 80 }),
        })
      );
      expect(session).toMatchObject({ id: 'session-1' });
    });

    it('throws NotFoundError when entry does not belong to user', async () => {
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);

      await expect(
        service.logSession('user-1', 'ghost', {
          startPage: 0,
          endPage: 10,
          durationSecs: 600,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        })
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ---- removeFromLibrary ---------------------------------------------------
  describe('removeFromLibrary', () => {
    it('deletes the entry', async () => {
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(fakeEntry() as any);
      vi.mocked(prisma.libraryEntry.delete).mockResolvedValue(fakeEntry() as any);

      await service.removeFromLibrary('user-1', 'entry-1');
      expect(prisma.libraryEntry.delete).toHaveBeenCalledWith({ where: { id: 'entry-1' } });
    });

    it('throws NotFoundError when entry does not exist', async () => {
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);

      await expect(service.removeFromLibrary('user-1', 'ghost')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ---- wishlist operations -------------------------------------------------
  describe('addToWishlist / removeFromWishlist', () => {
    it('adds a book to the wishlist', async () => {
      vi.mocked(prisma.wishlistEntry.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.wishlistEntry.create).mockResolvedValue({
        id: 'wish-1',
        userId: 'user-1',
        bookId: 'book-1',
        book: FAKE_BOOK,
      } as any);

      const result = await service.addToWishlist('user-1', 'book-1', 'MEDIUM');
      expect(result).toMatchObject({ id: 'wish-1' });
    });

    it('throws ConflictError when book is already on the wishlist', async () => {
      vi.mocked(prisma.wishlistEntry.findUnique).mockResolvedValue({ id: 'wish-1' } as any);

      await expect(service.addToWishlist('user-1', 'book-1', 'HIGH')).rejects.toBeInstanceOf(ConflictError);
    });

    it('removes a wishlist entry', async () => {
      vi.mocked(prisma.wishlistEntry.findFirst).mockResolvedValue({ id: 'wish-1' } as any);
      vi.mocked(prisma.wishlistEntry.delete).mockResolvedValue({} as any);

      await service.removeFromWishlist('user-1', 'wish-1');
      expect(prisma.wishlistEntry.delete).toHaveBeenCalledWith({ where: { id: 'wish-1' } });
    });

    it('throws NotFoundError when wishlist entry is missing', async () => {
      vi.mocked(prisma.wishlistEntry.findFirst).mockResolvedValue(null);

      await expect(service.removeFromWishlist('user-1', 'ghost')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
