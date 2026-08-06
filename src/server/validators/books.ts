import { z } from 'zod';

export const searchBooksSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  type: z.enum(['title', 'author', 'isbn', 'category']).default('title'),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(40).default(20),
});

export const importBookSchema = z.object({
  googleBooksId: z.string().min(1, 'Google Books ID is required'),
});

export const addToLibrarySchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  status: z.enum(['READING', 'COMPLETED', 'PAUSED', 'DROPPED', 'ARCHIVED', 'OWNED']).default('OWNED'),
  currentPage: z.number().int().min(0).default(0),
});

export const updateLibraryEntrySchema = z.object({
  status: z.enum(['READING', 'COMPLETED', 'PAUSED', 'DROPPED', 'ARCHIVED', 'OWNED']).optional(),
  currentPage: z.number().int().min(0).optional(),
  isFavorite: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
});

export const logSessionSchema = z.object({
  startPage: z.number().int().min(0),
  endPage: z.number().int().min(0),
  durationSecs: z.number().int().min(1),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  coverImage: z.string().url().optional(),
  isPublic: z.boolean().default(false),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  coverImage: z.string().url().optional(),
  isPublic: z.boolean().optional(),
});

export const addToCollectionSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  sortOrder: z.number().int().min(0).default(0),
});

export const upsertReviewSchema = z.object({
  rating: z.number().min(0.5).max(5).multipleOf(0.5),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
  isPrivate: z.boolean().default(false),
});

export const createNoteSchema = z.object({
  text: z.string().min(1).max(5000),
  page: z.number().int().min(1).optional(),
  chapter: z.number().int().min(1).optional(),
});

export const updateNoteSchema = z.object({
  text: z.string().min(1).max(5000).optional(),
  page: z.number().int().min(1).optional(),
  chapter: z.number().int().min(1).optional(),
});

export const createHighlightSchema = z.object({
  text: z.string().min(1).max(2000),
  color: z.enum(['amber', 'sage', 'rose', 'sky', 'lavender']).default('amber'),
  page: z.number().int().min(1).optional(),
  chapter: z.number().int().min(1).optional(),
});

export const addToWishlistSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  notes: z.string().max(500).optional(),
});

export const upsertGoalSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  targetBooks: z.number().int().min(1).max(1000),
  targetPages: z.number().int().min(1).optional(),
});

export type SearchBooksInput = z.infer<typeof searchBooksSchema>;
export type ImportBookInput = z.infer<typeof importBookSchema>;
export type AddToLibraryInput = z.infer<typeof addToLibrarySchema>;
export type UpdateLibraryEntryInput = z.infer<typeof updateLibraryEntrySchema>;
export type LogSessionInput = z.infer<typeof logSessionSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type AddToCollectionInput = z.infer<typeof addToCollectionSchema>;
export type UpsertReviewInput = z.infer<typeof upsertReviewSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type CreateHighlightInput = z.infer<typeof createHighlightSchema>;
export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
export type UpsertGoalInput = z.infer<typeof upsertGoalSchema>;
