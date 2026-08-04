/**
 * Authentication Controller
 * Handles HTTP requests for auth endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { authService } from '../services/supabaseAuthService';
import { profileService } from '../services/profileService';
import { validateData } from '../validators/auth';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  refreshTokenSchema,
} from '../validators/auth';
import { AuthenticationError, ValidationError } from '../utils/errors';

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password, confirmPassword, username } = validateData(
        registerSchema,
        req.body
      );

      const result = await authService.registerUser(email, password, username);

      res.status(201).json({
        user: result.user,
        session: result.session,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST /api/auth/login
   * Login endpoint - handled by frontend with Supabase
   * Backend only returns user profile for authenticated requests
   */
  async login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password } = validateData(loginSchema, req.body);

      // Note: Actual password verification is handled by Supabase
      // This endpoint is here for API consistency
      // Frontend should use Supabase.auth.signInWithPassword()

      res.json({
        message: 'Use Supabase auth to login. This endpoint validates credentials structure only.',
        success: false,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token - handled by Supabase directly
   */
  async refresh(req: AuthenticatedRequest, res: Response) {
    // Supabase handles token refresh automatically
    // Frontend can use supabase.auth.refreshSession()
    res.json({
      message: 'Use Supabase auth to refresh tokens. Supabase handles this automatically.',
      success: false,
    });
  }

  /**
   * POST /api/auth/logout
   * Logout user (client-side primarily, backend just validates)
   */
  async logout(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    res.json({ message: 'Logged out successfully' });
  }

  /**
   * POST /api/auth/change-password
   * Change user password (requires authentication)
   */
  async changePassword(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    try {
      const { newPassword, confirmPassword } = validateData(
        changePasswordSchema,
        req.body
      );

      await authService.changePassword(req.userId, newPassword);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset email
   */
  async forgotPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { email } = validateData(forgotPasswordSchema, req.body);

      await authService.forgotPassword(email);

      // Always return success for security (don't leak email existence)
      res.json({ message: 'If that email is registered, you will receive a password reset email.' });
    } catch (error) {
      // Log the error but return success response
      console.error('Forgot password error:', error);
      res.json({ message: 'If that email is registered, you will receive a password reset email.' });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user profile (requires authentication)
   */
  async getMe(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    try {
      const user = await profileService.getProfile(req.userId);
      res.json({ user });
    } catch (error) {
      throw error;
    }
  }

  /**
   * PUT /api/auth/profile
   * Update user profile (requires authentication)
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    try {
      const profileData = validateData(updateProfileSchema, req.body);

      const user = await profileService.updateProfile(req.userId, profileData);

      res.json({ user });
    } catch (error) {
      throw error;
    }
  }
}

export const authController = new AuthController();
