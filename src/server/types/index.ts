/**
 * Backend type definitions for authentication and user management
 */

import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  favoriteGenres: string[];
  readingGoal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: number;
  tokenType: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

export interface ProfileUpdateData {
  username?: string;
  avatar?: string;
  bio?: string;
  favoriteGenres?: string[];
  readingGoal?: number;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  token?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: ValidationError[];
  timestamp?: string;
}

export interface SuccessResponse<T = any> {
  data?: T;
  message?: string;
  timestamp?: string;
}
