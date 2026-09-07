import { z } from 'zod';

// ─── Book Clubs ─────────────────────────────────────────────────────────────────

export const createClubSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  coverImage: z.string().url('Invalid URL').optional(),
  currentBookId: z.string().uuid('Invalid book ID').optional(),
  isPrivate: z.boolean().default(false),
});

export const updateClubSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  coverImage: z.string().url('Invalid URL').optional(),
  currentBookId: z.string().uuid('Invalid book ID').nullable().optional(),
  isPrivate: z.boolean().optional(),
});

// ─── Discussions & Comments ─────────────────────────────────────────────────────

export const createDiscussionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(10000),
});

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(5000),
});

// ─── Feed pagination ────────────────────────────────────────────────────────────

/**
 * `circle` is the union of the caller, the people they follow, and their club
 * co-members. There is deliberately no "everyone" scope: activity is visible
 * only to readers who share a connection with the actor.
 */
export const feedQuerySchema = z.object({
  scope: z.enum(['circle', 'me']).default('circle'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

// ─── Reader discovery ───────────────────────────────────────────────────────────

export const userSearchSchema = z.object({
  q: z.string().trim().min(1, 'Search term is required').max(50),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const suggestedReadersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
export type UserSearchInput = z.infer<typeof userSearchSchema>;
export type SuggestedReadersInput = z.infer<typeof suggestedReadersSchema>;
