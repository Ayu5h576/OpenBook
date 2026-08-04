/**
 * Zod validation schemas for authentication endpoints
 */

import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

const bioSchema = z.string().max(500, 'Bio must be at most 500 characters').optional();

const avatarSchema = z.string().url('Invalid URL').optional();

const genresSchema = z.array(z.string()).default([]);

const readingGoalSchema = z.number().int().min(1, 'Reading goal must be at least 1').default(12);

// Register validation
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    username: usernameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// Login validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Forgot password validation
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// Change password validation
export const changePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Profile update validation
export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  avatar: avatarSchema,
  bio: bioSchema,
  favoriteGenres: genresSchema,
  readingGoal: readingGoalSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Refresh token validation
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// Helper function to validate data
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw { message: 'Validation failed', details };
    }
    throw error;
  }
}
