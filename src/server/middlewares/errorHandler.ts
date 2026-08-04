/**
 * Global error handling middleware for Express
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, isApiError } from '../utils/errors';

export function errorHandlerMiddleware(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const timestamp = new Date().toISOString();

  if (isApiError(error)) {
    console.error(`[${timestamp}] ${error.name}: ${error.message}`);
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp,
    });
  }

  // Handle validation errors from Zod
  if (error instanceof Error && error.message === 'Validation failed') {
    const details = (error as any).details;
    console.error(`[${timestamp}] ValidationError: ${error.message}`);
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
      timestamp,
    });
  }

  // Handle Zod errors
  if (error instanceof Error && 'errors' in error) {
    console.error(`[${timestamp}] ValidationError: ${error.message}`);
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: (error as any).errors?.map((e: any) => ({
        field: e.path?.join('.') || 'unknown',
        message: e.message,
      })),
      timestamp,
    });
  }

  // Fallback for unexpected errors
  console.error(`[${timestamp}] Unexpected Error:`, error);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    timestamp,
  });
}

// Middleware to catch async errors in route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
