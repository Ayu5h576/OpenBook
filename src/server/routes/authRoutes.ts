/**
 * Authentication Routes
 * Defines all auth endpoints
 */

import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// Register new user
router.post('/register', asyncHandler((req, res, next) => authController.register(req as any, res)));

// Login user
router.post('/login', asyncHandler((req, res, next) => authController.login(req as any, res)));

// Refresh access token
router.post('/refresh', asyncHandler((req, res, next) => authController.refresh(req as any, res)));

// Forgot password (send reset email)
router.post(
  '/forgot-password',
  asyncHandler((req, res, next) => authController.forgotPassword(req as any, res))
);

/**
 * Protected routes (authentication required)
 */

// Get current user profile
router.get('/me', authMiddleware, asyncHandler((req, res, next) => authController.getMe(req as any, res)));

// Update user profile
router.put(
  '/profile',
  authMiddleware,
  asyncHandler((req, res, next) => authController.updateProfile(req as any, res))
);

// Change password
router.post(
  '/change-password',
  authMiddleware,
  asyncHandler((req, res, next) => authController.changePassword(req as any, res))
);

// Logout
router.post('/logout', authMiddleware, asyncHandler((req, res, next) => authController.logout(req as any, res)));

export default router;
