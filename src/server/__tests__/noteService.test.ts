/**
 * NoteService — unit tests
 *
 * The annotation store behind the reading room. Prisma is mocked. The property
 * that matters most is ownership: every method funnels through
 * `requireEntryOwner`, so one reader can never read or modify another's notes
 * or highlights — a highlighted passage is keyed to a LibraryEntry the caller
 * must own.
 *
 * Every test drives the owner check through the same mock seam: when
 * `libraryEntry.findFirst` resolves, the caller owns the entry; when it
 * resolves null, the method must reject with AuthorizationError *before*
 * touching any note/highlight row.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteService } from '../services/noteService';
import { NotFoundError, AuthorizationError } from '../utils/errors';

// The factory is hoisted above every const, so it must build the mock with
// inline vi.fn() — no reference to an outer variable. Tests then reach the same
// fns through the mocked module import below.
vi.mock('../config/prisma', () => ({
  prisma: {
    libraryEntry: { findFirst: vi.fn() },
    bookNote: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bookHighlight: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../config/prisma';
const prismaMock = prisma as any;

const OWNER = 'user-1';
const INTRUDER = 'user-2';
const ENTRY = 'entry-1';
const NOTE = 'note-1';
const HL = 'hl-1';

const ownedEntry = { id: ENTRY, userId: OWNER, bookId: 'book-1' };

let service: NoteService;

beforeEach(() => {
  service = new NoteService();
  vi.clearAllMocks();
});

/** The caller owns the entry: the owner guard passes. */
function grantOwnership() {
  prismaMock.libraryEntry.findFirst.mockResolvedValue(ownedEntry as any);
}

/** The caller does not own the entry (or it does not exist): guard rejects. */
function denyOwnership() {
  prismaMock.libraryEntry.findFirst.mockResolvedValue(null);
}

describe('noteService — ownership guard', () => {
  it.each([
    ['getNotes', (s: NoteService) => s.getNotes(INTRUDER, ENTRY)],
    ['createNote', (s: NoteService) => s.createNote(INTRUDER, ENTRY, { text: 'x' })],
    ['updateNote', (s: NoteService) => s.updateNote(INTRUDER, ENTRY, NOTE, { text: 'x' })],
    ['deleteNote', (s: NoteService) => s.deleteNote(INTRUDER, ENTRY, NOTE)],
    ['getHighlights', (s: NoteService) => s.getHighlights(INTRUDER, ENTRY)],
    ['createHighlight', (s: NoteService) => s.createHighlight(INTRUDER, ENTRY, { text: 'x' })],
    ['deleteHighlight', (s: NoteService) => s.deleteHighlight(INTRUDER, ENTRY, HL)],
  ])('%s rejects a non-owner before touching any note row', async (_name, call) => {
    denyOwnership();

    await expect(call(service)).rejects.toBeInstanceOf(AuthorizationError);
    // The guard is the only query that may run — no note/highlight row is
    // read or written on the intruder's behalf.
    for (const model of [prismaMock.bookNote, prismaMock.bookHighlight]) {
      for (const method of Object.values(model)) {
        expect(method).not.toHaveBeenCalled();
      }
    }
  });
});

describe('noteService — notes', () => {
  it('returns the owner’s notes for an entry, newest first', async () => {
    grantOwnership();
    const rows = [{ id: NOTE, entryId: ENTRY, text: 'aha' }];
    prismaMock.bookNote.findMany.mockResolvedValue(rows);

    const result = await service.getNotes(OWNER, ENTRY);

    expect(prismaMock.bookNote.findMany).toHaveBeenCalledWith({
      where: { entryId: ENTRY },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(rows);
  });

  it('creates a note on the caller’s entry', async () => {
    grantOwnership();
    const created = { id: NOTE, entryId: ENTRY, text: 'margin', chapter: 1, page: null };
    prismaMock.bookNote.create.mockResolvedValue(created);

    const result = await service.createNote(OWNER, ENTRY, { text: 'margin', chapter: 1 });

    expect(prismaMock.bookNote.create).toHaveBeenCalledWith({
      data: { entryId: ENTRY, text: 'margin', chapter: 1 },
    });
    expect(result).toEqual(created);
  });

  it('updates a note that belongs to this entry', async () => {
    grantOwnership();
    prismaMock.bookNote.findFirst.mockResolvedValue({ id: NOTE, entryId: ENTRY });
    prismaMock.bookNote.update.mockResolvedValue({ id: NOTE, text: 'edited' });

    const result = await service.updateNote(OWNER, ENTRY, NOTE, { text: 'edited' });

    expect(prismaMock.bookNote.findFirst).toHaveBeenCalledWith({ where: { id: NOTE, entryId: ENTRY } });
    expect(prismaMock.bookNote.update).toHaveBeenCalledWith({ where: { id: NOTE }, data: { text: 'edited' } });
    expect(result.text).toBe('edited');
  });

  it('throws NotFound for a note id that is not under this entry', async () => {
    grantOwnership();
    prismaMock.bookNote.findFirst.mockResolvedValue(null); // note exists elsewhere / not at all

    await expect(service.updateNote(OWNER, ENTRY, NOTE, { text: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    expect(prismaMock.bookNote.update).not.toHaveBeenCalled();
  });

  it('deletes a note the owner can see', async () => {
    grantOwnership();
    prismaMock.bookNote.findFirst.mockResolvedValue({ id: NOTE, entryId: ENTRY });
    prismaMock.bookNote.delete.mockResolvedValue({ id: NOTE });

    await service.deleteNote(OWNER, ENTRY, NOTE);

    expect(prismaMock.bookNote.delete).toHaveBeenCalledWith({ where: { id: NOTE } });
  });
});

describe('noteService — highlights', () => {
  it('returns the owner’s highlights for an entry, newest first', async () => {
    grantOwnership();
    const rows = [{ id: HL, entryId: ENTRY, text: 'quote', color: 'rose' }];
    prismaMock.bookHighlight.findMany.mockResolvedValue(rows);

    const result = await service.getHighlights(OWNER, ENTRY);

    expect(prismaMock.bookHighlight.findMany).toHaveBeenCalledWith({
      where: { entryId: ENTRY },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(rows);
  });

  it('creates a highlight, carrying the chosen color and chapter through', async () => {
    grantOwnership();
    const created = { id: HL, entryId: ENTRY, text: 'quote', color: 'sage', chapter: 2 };
    prismaMock.bookHighlight.create.mockResolvedValue(created);

    const result = await service.createHighlight(OWNER, ENTRY, { text: 'quote', color: 'sage', chapter: 2 });

    expect(prismaMock.bookHighlight.create).toHaveBeenCalledWith({
      data: { entryId: ENTRY, text: 'quote', color: 'sage', chapter: 2 },
    });
    expect(result).toEqual(created);
  });

  it('deletes a highlight the owner can see', async () => {
    grantOwnership();
    prismaMock.bookHighlight.findFirst.mockResolvedValue({ id: HL, entryId: ENTRY });
    prismaMock.bookHighlight.delete.mockResolvedValue({ id: HL });

    await service.deleteHighlight(OWNER, ENTRY, HL);

    expect(prismaMock.bookHighlight.delete).toHaveBeenCalledWith({ where: { id: HL } });
  });

  it('throws NotFound for a highlight id that is not under this entry', async () => {
    grantOwnership();
    prismaMock.bookHighlight.findFirst.mockResolvedValue(null);

    await expect(service.deleteHighlight(OWNER, ENTRY, HL)).rejects.toBeInstanceOf(NotFoundError);
    expect(prismaMock.bookHighlight.delete).not.toHaveBeenCalled();
  });
});
