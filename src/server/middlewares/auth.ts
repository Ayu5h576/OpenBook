/**
 * Authentication middleware - Verifies access tokens issued by this server
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { AuthenticationError } from '../utils/errors';
import { verifyAccessToken } from '../utils/tokens';

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('Missing authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError('Invalid authorization header format');
    }

    const token = parts[1];

    const payload = await verifyAccessToken(token);

    // Extract user information from token
    req.userId = payload.sub;
    req.userEmail = payload.email as string | undefined;
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[Auth] Token verification failed:', error);

    res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }
}

export async function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const parts = authHeader?.split(' ') ?? [];

  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const token = parts[1];
      const payload = await verifyAccessToken(token);

      req.userId = payload.sub;
      req.userEmail = payload.email as string | undefined;
      req.token = token;
    } catch {
      // Token invalid but that's ok for optional auth
    }
  }

  next();
}
