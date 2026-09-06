import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NoteApiService, ApiNote, ApiHighlight } from '../services/api';

/** The five annotation colors the schema allows (`book_highlights.color`). */
export const HIGHLIGHT_COLORS = ['amber', 'sage', 'rose', 'sky', 'lavender'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export interface NoteInput {
  text: string;
  page?: number;
  chapter?: number;
}

export interface HighlightInput {
  text: string;
  color?: HighlightColor;
  page?: number;
  chapter?: number;
}

/**
 * Notes & highlights for one library entry — the reader's annotations on a book.
 *
 * The two lists live under distinct query keys so either can be refetched on its
 * own, but every mutation invalidates both prefixes for *this entry only*. There
 * is deliberately no global annotations list to purge — the reader is the only
 * surface that shows them.
 *
 * `entryId` is often null on first paint: the reader resolves whether the book
 * is in the library before annotations can load. Pass null and the queries stay
 * disabled (and `pending` is true) rather than firing against an empty id.
 */
export function useNotes(entryId: string | null | undefined) {
  const enabled = !!entryId;
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    if (!entryId) return;
    queryClient.invalidateQueries({ queryKey: ['notes', entryId] });
    queryClient.invalidateQueries({ queryKey: ['highlights', entryId] });
  }, [entryId, queryClient]);

  const notesQuery = useQuery({
    queryKey: ['notes', entryId ?? ''],
    enabled,
    queryFn: async () => {
      const res = await NoteApiService.getNotes(entryId!);
      if (res.error) throw new Error(res.error);
      return res.data?.notes ?? [];
    },
  });

  const highlightsQuery = useQuery({
    queryKey: ['highlights', entryId ?? ''],
    enabled,
    queryFn: async () => {
      const res = await NoteApiService.getHighlights(entryId!);
      if (res.error) throw new Error(res.error);
      return res.data?.highlights ?? [];
    },
  });

  const createNote = useMutation({
    mutationFn: async (input: NoteInput) => {
      if (!entryId) throw new Error('Add the book to your library before taking notes');
      const res = await NoteApiService.createNote(entryId, input);
      if (res.error) throw new Error(res.error);
      return res.data!.note;
    },
    onSuccess: invalidate,
  });

  const updateNote = useMutation({
    mutationFn: async ({ noteId, data }: { noteId: string; data: Partial<NoteInput> }) => {
      if (!entryId) throw new Error('Add the book to your library before taking notes');
      const res = await NoteApiService.updateNote(entryId, noteId, data);
      if (res.error) throw new Error(res.error);
      return res.data!.note;
    },
    onSuccess: invalidate,
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      if (!entryId) throw new Error('Add the book to your library before taking notes');
      const res = await NoteApiService.deleteNote(entryId, noteId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  const createHighlight = useMutation({
    mutationFn: async (input: HighlightInput) => {
      if (!entryId) throw new Error('Add the book to your library before highlighting');
      const res = await NoteApiService.createHighlight(entryId, input);
      if (res.error) throw new Error(res.error);
      return res.data!.highlight;
    },
    onSuccess: invalidate,
  });

  const deleteHighlight = useMutation({
    mutationFn: async (highlightId: string) => {
      if (!entryId) throw new Error('Add the book to your library before highlighting');
      const res = await NoteApiService.deleteHighlight(entryId, highlightId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  const addNote = useCallback((input: NoteInput) => createNote.mutateAsync(input), [createNote]);
  const editNote = useCallback(
    (noteId: string, data: Partial<NoteInput>) => updateNote.mutateAsync({ noteId, data }),
    [updateNote]
  );
  const removeNote = useCallback((noteId: string) => deleteNote.mutateAsync(noteId), [deleteNote]);
  const addHighlight = useCallback(
    (input: HighlightInput) => createHighlight.mutateAsync(input),
    [createHighlight]
  );
  const removeHighlight = useCallback(
    (highlightId: string) => deleteHighlight.mutateAsync(highlightId),
    [deleteHighlight]
  );

  const error = notesQuery.error
    ? notesQuery.error.message
    : highlightsQuery.error
      ? highlightsQuery.error.message
      : null;

  return {
    notes: notesQuery.data ?? [],
    highlights: highlightsQuery.data ?? [],
    /** True while the caller is still resolving whether this book has an entry. */
    pending: !enabled,
    loading: enabled && (notesQuery.isLoading || highlightsQuery.isLoading),
    error,
    refetch: async () => {
      await Promise.all([notesQuery.refetch(), highlightsQuery.refetch()]);
    },
    addNote,
    editNote,
    removeNote,
    addHighlight,
    removeHighlight,
    saving:
      createNote.isPending ||
      updateNote.isPending ||
      deleteNote.isPending ||
      createHighlight.isPending ||
      deleteHighlight.isPending,
  };
}

export type { ApiNote as Note, ApiHighlight as Highlight };
