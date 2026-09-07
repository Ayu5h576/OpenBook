/**
 * AI Validators - Zod schemas for AI feature requests
 */

import { z } from 'zod';

export const readingCompassSchema = z.object({
  limit: z.number().int().min(1).max(10).optional().default(5),
  genres: z.array(z.string()).optional(),
  useCache: z.boolean().optional().default(true),
});

export const bookDNASchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  useCache: z.boolean().optional().default(true),
});

export const summarySchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  format: z.enum(['quick', 'detailed', 'chapter', 'theme', 'character']).default('quick'),
  spoilerLevel: z.enum(['none', 'mild', 'full']).optional().default('none'),
});

export const chatSchema = z.object({
  message: z.string().min(1, 'Message required').max(1000, 'Message too long'),
  bookId: z.string().uuid('Invalid book ID').optional(),
  context: z.string().optional(),
  conversationId: z.string().optional(),
  // Study-chat: ground the answer in the reader's own saved highlights/notes.
  entryId: z.string().uuid('Invalid entry ID').optional(),
  chapterNum: z.number().int().min(1).max(999).optional(),
});

export const insightsSchema = z.object({
  useCache: z.boolean().optional().default(true),
});

export const plannerSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  dailyAvailableMinutes: z.number().int().min(15).max(480).optional().default(60),
});

export const searchSimilarSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  limit: z.number().int().min(1).max(20).optional().default(5),
});

export const studyPackSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  chapterNum: z.number().int().min(1).max(999).default(1),
  // Chapter text is client-supplied: the reader synthesizes chapters from the
  // book description, so the server has no chapter store of its own.
  chapterTitle: z.string().max(300).optional(),
  chapterText: z.string().min(1, 'Chapter text required').max(12000, 'Chapter text too long'),
});

/**
 * Author insight takes only the author's *name*: the profile it reasons over is
 * rebuilt server-side from the reader's own library. Accepting the history from
 * the client would let a caller feed the model whatever facts it liked and get
 * them echoed back as a personalized recommendation.
 */
export const authorInsightSchema = z.object({
  author: z.string().min(1, 'Author name required').max(200, 'Author name too long'),
});

// Type exports
export type ReadingCompassInput = z.infer<typeof readingCompassSchema>;
export type BookDNAInput = z.infer<typeof bookDNASchema>;
export type SummaryInput = z.infer<typeof summarySchema>;
export type ChatInput = z.infer<typeof chatSchema>;
export type InsightsInput = z.infer<typeof insightsSchema>;
export type PlannerInput = z.infer<typeof plannerSchema>;
export type SearchSimilarInput = z.infer<typeof searchSimilarSchema>;
export type StudyPackInput = z.infer<typeof studyPackSchema>;
export type AuthorInsightInput = z.infer<typeof authorInsightSchema>;
