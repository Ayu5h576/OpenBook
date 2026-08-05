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

/**
 * Maps a Prisma error to the equivalent API error.
 * Codes: https://www.prisma.io/docs/orm/reference/error-reference
 */
export function mapPrismaError(error: any): ApiError {
  if (isApiError(error)) {
    return error;
  }

  switch (error?.code) {
    case 'P2002': {
      const target = error?.meta?.target;
      const field = Array.isArray(target) ? target[0] : target;
      return new ConflictError(
        field ? `That ${field} is already taken` : 'Record already exists'
      );
    }
    case 'P2025':
      return new NotFoundError('Resource');
    case 'P2003':
      return new ValidationError('Referenced record does not exist');
    default:
      console.error('[Prisma] Unmapped error:', error);
      return new ServerError('Database error');
  }
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}
