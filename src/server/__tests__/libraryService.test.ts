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
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    wishlistEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
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
    /** The controller always hands the service a fully-defaulted query object. */
    const query = (over: Record<string, any> = {}) => ({ limit: 24, ...over }) as any;

    it('returns a page plus the real size of the filtered set', async () => {
      const entries = [fakeEntry(), fakeEntry({ id: 'entry-2' })];
      vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue(entries as any);
      vi.mocked(prisma.libraryEntry.count).mockResolvedValue(2);

      const result = await service.getUserLibrary('user-1', query());

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.nextCursor).toBeNull();
      expect(prisma.libraryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
    });

    it('filters by status when provided', async () => {
      vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue([]);
      vi.mocked(prisma.libraryEntry.count).mockResolvedValue(0);

      await service.getUserLibrary('user-1', query({ status: 'COMPLETED' }));

      const where = { userId: 'user-1', status: 'COMPLETED' };
      expect(prisma.libraryEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
      // `total` is the size of the *filtered* set — the header would lie otherwise.
      expect(prisma.libraryEntry.count).toHaveBeenCalledWith({ where });
    });

    it('narrows to a single book so the book page never has to scan a page', async () => {
      vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue([]);
      vi.mocked(prisma.libraryEntry.count).mockResolvedValue(0);

      await service.getUserLibrary('user-1', query({ bookId: 'book-9' }));

      expect(prisma.libraryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', bookId: 'book-9' } })
      );
    });

    it('over-fetches by one, then trims it and reports the last kept id as the cursor', async () => {
      const rows = [fakeEntry(), fakeEntry({ id: 'entry-2' }), fakeEntry({ id: 'entry-3' })];
      vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue(rows as any);
      vi.mocked(prisma.libraryEntry.count).mockResolvedValue(3);

      const result = await service.getUserLibrary('user-1', query({ limit: 2 }));

      expect(prisma.libraryEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
      expect(result.entries.map((e) => e.id)).toEqual(['entry-1', 'entry-2']);
      expect(result.nextCursor).toBe('entry-2');
      expect(result.total).toBe(3);
    });

    it('skips the cursor row so a page never repeats its anchor', async () => {
      vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue([]);
      vi.mocked(prisma.libraryEntry.count).mockResolvedValue(0);

      await service.getUserLibrary('user-1', query({ cursor: 'entry-2' }));

      expect(prisma.libraryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'entry-2' }, skip: 1 })
      );
    });

    it('sorts on a total order, with never-opened books last', async () => {
      vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue([]);
      vi.mocked(prisma.libraryEntry.count).mockResolvedValue(0);

      await service.getUserLibrary('user-1', query());

      const { orderBy } = vi.mocked(prisma.libraryEntry.findMany).mock.calls[0][0] as any;
      // Postgres sorts NULLs first for DESC; without `nulls: 'last'` every
      // untouched book outranks the one being read.
      expect(orderBy).toContainEqual({ lastReadAt: { sort: 'desc', nulls: 'last' } });
      // A non-unique sort key lets cursor pages repeat or drop rows.
      expect(orderBy[orderBy.length - 1]).toEqual({ id: 'desc' });
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

    it('promotes a paused book back to READING when a session is logged', async () => {
      const existing = fakeEntry({ status: 'PAUSED', currentPage: 30, startedAt: new Date('2026-01-01') });
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.readingSession.create).mockResolvedValue({ id: 'session-2' } as any);
      vi.mocked(prisma.libraryEntry.update).mockResolvedValue(existing as any);
      vi.mocked(prisma.$transaction).mockImplementation((ops: any) =>
        Array.isArray(ops) ? Promise.all(ops) : ops(prisma)
      );

      await service.logSession('user-1', 'entry-1', {
        startPage: 30,
        endPage: 45,
        durationSecs: 900,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      });

      expect(prisma.libraryEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'READING', currentPage: 45 }),
        })
      );
    });

    it('does not reopen a completed book when a session is logged', async () => {
      const existing = fakeEntry({ status: 'COMPLETED', currentPage: 180 });
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.readingSession.create).mockResolvedValue({ id: 'session-3' } as any);
      vi.mocked(prisma.libraryEntry.update).mockResolvedValue(existing as any);
      vi.mocked(prisma.$transaction).mockImplementation((ops: any) =>
        Array.isArray(ops) ? Promise.all(ops) : ops(prisma)
      );

      await service.logSession('user-1', 'entry-1', {
        startPage: 170,
        endPage: 180,
        durationSecs: 600,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      });

      const updateArg = vi.mocked(prisma.libraryEntry.update).mock.calls[0][0] as any;
      expect(updateArg.data.status).toBeUndefined();
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

  // ---- resolve entry by book ----------------------------------------------
  describe('getEntryByBook', () => {
    it('returns the caller’s entry for a book they own', async () => {
      const entry = fakeEntry({ bookId: 'book-1' });
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(entry as any);

      const result = await service.getEntryByBook('user-1', 'book-1');

      // Ownership is part of the where — this is how one reader cannot resolve
      // another's copy.
      expect(prisma.libraryEntry.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', bookId: 'book-1' },
      });
      expect(result).toEqual(entry);
    });

    it('returns null (not an error) when the book is not in the library', async () => {
      vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);

      const result = await service.getEntryByBook('user-1', 'not-owned');

      expect(result).toBeNull();
    });
  });

  // ---- wishlist operations -------------------------------------------------
  describe('getWishlist', () => {
    it('paginates the same way the library does', async () => {
      const rows = [
        { id: 'wish-1', book: FAKE_BOOK },
        { id: 'wish-2', book: FAKE_BOOK },
      ];
      vi.mocked(prisma.wishlistEntry.findMany).mockResolvedValue(rows as any);
      vi.mocked(prisma.wishlistEntry.count).mockResolvedValue(2);

      const result = await service.getWishlist('user-1', { limit: 1 } as any);

      expect(result.entries.map((e) => e.id)).toEqual(['wish-1']);
      expect(result.nextCursor).toBe('wish-1');
      expect(result.total).toBe(2);

      const { orderBy } = vi.mocked(prisma.wishlistEntry.findMany).mock.calls[0][0] as any;
      expect(orderBy[orderBy.length - 1]).toEqual({ id: 'desc' });
    });

    it('narrows to a single book for the book page', async () => {
      vi.mocked(prisma.wishlistEntry.findMany).mockResolvedValue([]);
      vi.mocked(prisma.wishlistEntry.count).mockResolvedValue(0);

      await service.getWishlist('user-1', { limit: 24, bookId: 'book-9' } as any);

      expect(prisma.wishlistEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', bookId: 'book-9' } })
      );
    });
  });

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
