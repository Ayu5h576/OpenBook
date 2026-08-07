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

// Type exports
export type ReadingCompassInput = z.infer<typeof readingCompassSchema>;
export type BookDNAInput = z.infer<typeof bookDNASchema>;
export type SummaryInput = z.infer<typeof summarySchema>;
export type ChatInput = z.infer<typeof chatSchema>;
export type InsightsInput = z.infer<typeof insightsSchema>;
export type PlannerInput = z.infer<typeof plannerSchema>;
export type SearchSimilarInput = z.infer<typeof searchSimilarSchema>;
