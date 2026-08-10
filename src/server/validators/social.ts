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

export const feedQuerySchema = z.object({
  scope: z.enum(['following', 'me', 'global']).default('following'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
