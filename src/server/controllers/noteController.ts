import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { noteService } from '../services/noteService';
import { validateData } from '../validators/auth';
import { createNoteSchema, updateNoteSchema, createHighlightSchema } from '../validators/books';
import { AuthenticationError } from '../utils/errors';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class NoteController {
  async getNotes(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const notes = await noteService.getNotes(userId, req.params.entryId);
    res.json({ notes });
  }

  async createNote(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(createNoteSchema, req.body);
    const note = await noteService.createNote(userId, req.params.entryId, input);
    res.status(201).json({ note });
  }

  async updateNote(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(updateNoteSchema, req.body);
    const note = await noteService.updateNote(userId, req.params.entryId, req.params.noteId, input);
    res.json({ note });
  }

  async deleteNote(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    await noteService.deleteNote(userId, req.params.entryId, req.params.noteId);
    res.json({ message: 'Note deleted' });
  }

  async getHighlights(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const highlights = await noteService.getHighlights(userId, req.params.entryId);
    res.json({ highlights });
  }

  async createHighlight(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(createHighlightSchema, req.body);
    const highlight = await noteService.createHighlight(userId, req.params.entryId, input);
    res.status(201).json({ highlight });
  }

  async deleteHighlight(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    await noteService.deleteHighlight(userId, req.params.entryId, req.params.highlightId);
    res.json({ message: 'Highlight deleted' });
  }
}

export const noteController = new NoteController();
