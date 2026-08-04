/**
 * Custom error classes and error handling utilities
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(401, message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Not authorized') {
    super(403, message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(500, message, 'INTERNAL_SERVER_ERROR');
    this.name = 'ServerError';
  }
}

export function mapSupabaseError(error: any): ApiError {
  const message = error?.message || 'Unknown error';
  const code = error?.code || 'UNKNOWN_ERROR';

  // Map common Supabase errors
  if (message.includes('duplicate') || code === '23505') {
    return new ConflictError('Email or username already exists');
  }
  if (message.includes('invalid') || code === '401') {
    return new AuthenticationError('Invalid credentials');
  }
  if (message.includes('permission') || code === '42501') {
    return new AuthorizationError('Insufficient permissions');
  }
  if (code === 'PGRST116' || message.includes('not found')) {
    return new NotFoundError('Resource');
  }

  return new ServerError(`Supabase error: ${message}`);
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}
