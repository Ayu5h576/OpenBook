/**
 * Authentication middleware - Verifies JWT tokens from Supabase
 */

import { Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { AuthenticatedRequest } from '../types/index';
import { AuthenticationError } from '../utils/errors';
import { env } from '../config/env';

const JWT_SECRET = new TextEncoder().encode(env.supabase.jwtSecret);

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

    // Verify JWT token
    const verified = await jwtVerify(token, JWT_SECRET);

    // Extract user information from token
    const payload = verified.payload as any;
    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }
}

export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        // Try to verify but don't fail if invalid
        jwtVerify(token, JWT_SECRET)
          .then((verified) => {
            const payload = verified.payload as any;
            req.userId = payload.sub;
            req.userEmail = payload.email;
            req.token = token;
            next();
          })
          .catch(() => {
            // Token invalid but that's ok for optional auth
            next();
          });
      } else {
        next();
      }
    } else {
      next();
    }
  } catch (error) {
    next();
  }
}
