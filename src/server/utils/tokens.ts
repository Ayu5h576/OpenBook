/**
 * Access and refresh token helpers
 */

import { createHash, randomBytes } from 'crypto';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { env } from '../config/env';
import { AuthenticationError } from './errors';

const SECRET = new TextEncoder().encode(env.jwt.secret);

export const REFRESH_COOKIE_NAME = 'openbook_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';

export async function signAccessToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.jwt.accessTtl)
    .sign(SECRET);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  let payload: JWTPayload;

  try {
    ({ payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] }));
  } catch {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Refresh tokens are opaque, but reject anything that isn't explicitly an
  // access token so a future token type can never be replayed as one.
  if (payload.type !== 'access' || !payload.sub) {
    throw new AuthenticationError('Token is not a valid access token');
  }

  return payload;
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
}

export function accessTokenExpiresIn(): number {
  const match = /^(\d+)([smhd])$/.exec(env.jwt.accessTtl);

  if (!match) {
    throw new Error(`Invalid ACCESS_TOKEN_TTL: ${env.jwt.accessTtl}`);
  }

  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(match[1], 10) * multipliers[match[2]];
}
