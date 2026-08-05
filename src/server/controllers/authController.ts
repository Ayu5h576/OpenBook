/**
 * Authentication Controller
 * Handles HTTP requests for auth endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { validateData } from '../validators/auth';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validators/auth';
import { AuthenticationError } from '../utils/errors';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, refreshTokenExpiry } from '../utils/tokens';
import { env } from '../config/env';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.app.nodeEnv === 'production',
    path: REFRESH_COOKIE_PATH,
    expires: refreshTokenExpiry(),
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.app.nodeEnv === 'production',
    path: REFRESH_COOKIE_PATH,
  });
}

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: AuthenticatedRequest, res: Response) {
    const { email, password, username } = validateData(registerSchema, req.body);

    const { user, session, refreshToken } = await authService.registerUser(
      email,
      password,
      username
    );

    setRefreshCookie(res, refreshToken);

    res.status(201).json({ user, session });
  }

  /**
   * POST /api/auth/login
   */
  async login(req: AuthenticatedRequest, res: Response) {
    const { email, password } = validateData(loginSchema, req.body);

    const { user, session, refreshToken } = await authService.loginUser(email, password);

    setRefreshCookie(res, refreshToken);

    res.json({ user, session });
  }

  /**
   * POST /api/auth/refresh
   * Authenticates via the refresh cookie rather than a Bearer token.
   */
  async refresh(req: AuthenticatedRequest, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!token) {
      throw new AuthenticationError('Missing refresh token');
    }

    try {
      const { user, session, refreshToken } = await authService.refreshSession(token);

      setRefreshCookie(res, refreshToken);

      res.json({ user, session });
    } catch (error) {
      // The stored token is unusable, so drop the client's copy too - otherwise
      // it retries with the same dead cookie on every request.
      clearRefreshCookie(res);
      throw error;
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response) {
    await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);

    clearRefreshCookie(res);

    res.json({ message: 'Logged out successfully' });
  }

  /**
   * POST /api/auth/change-password
   */
  async changePassword(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    const { newPassword } = validateData(changePasswordSchema, req.body);

    await authService.changePassword(req.userId, newPassword);

    // Every session was revoked, including this one.
    clearRefreshCookie(res);

    res.json({ message: 'Password changed successfully. Please sign in again.' });
  }

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { email } = validateData(forgotPasswordSchema, req.body);

      await authService.forgotPassword(email);
    } catch (error) {
      // Log but still return success below: the response must not reveal
      // whether the email is registered.
      console.error('Forgot password error:', error);
    }

    res.json({
      message: 'If that email is registered, you will receive a password reset email.',
    });
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    const user = await profileService.getProfile(req.userId);

    res.json({ user });
  }

  /**
   * PUT /api/auth/profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    const profileData = validateData(updateProfileSchema, req.body);

    const user = await profileService.updateProfile(req.userId, profileData);

    res.json({ user });
  }
}

export const authController = new AuthController();
