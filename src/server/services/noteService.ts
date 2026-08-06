import { prisma } from '../config/prisma';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import type { CreateNoteInput, UpdateNoteInput, CreateHighlightInput } from '../validators/books';

export class NoteService {
  async getNotes(userId: string, entryId: string) {
    await this.requireEntryOwner(userId, entryId);
    return prisma.bookNote.findMany({
      where: { entryId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNote(userId: string, entryId: string, input: CreateNoteInput) {
    await this.requireEntryOwner(userId, entryId);
    return prisma.bookNote.create({ data: { entryId, ...input } as any });
  }

  async updateNote(userId: string, entryId: string, noteId: string, input: UpdateNoteInput) {
    await this.requireEntryOwner(userId, entryId);
    const note = await prisma.bookNote.findFirst({ where: { id: noteId, entryId } });
    if (!note) throw new NotFoundError('Note');
    return prisma.bookNote.update({ where: { id: noteId }, data: input });
  }

  async deleteNote(userId: string, entryId: string, noteId: string) {
    await this.requireEntryOwner(userId, entryId);
    const note = await prisma.bookNote.findFirst({ where: { id: noteId, entryId } });
    if (!note) throw new NotFoundError('Note');
    await prisma.bookNote.delete({ where: { id: noteId } });
  }

  async getHighlights(userId: string, entryId: string) {
    await this.requireEntryOwner(userId, entryId);
    return prisma.bookHighlight.findMany({
      where: { entryId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createHighlight(userId: string, entryId: string, input: CreateHighlightInput) {
    await this.requireEntryOwner(userId, entryId);
    return prisma.bookHighlight.create({ data: { entryId, ...input } as any });
  }

  async deleteHighlight(userId: string, entryId: string, highlightId: string) {
    await this.requireEntryOwner(userId, entryId);
    const hl = await prisma.bookHighlight.findFirst({ where: { id: highlightId, entryId } });
    if (!hl) throw new NotFoundError('Highlight');
    await prisma.bookHighlight.delete({ where: { id: highlightId } });
  }

  private async requireEntryOwner(userId: string, entryId: string) {
    const entry = await prisma.libraryEntry.findFirst({ where: { id: entryId, userId } });
    if (!entry) throw new AuthorizationError('Access denied or entry not found');
    return entry;
  }
}

export const noteService = new NoteService();
