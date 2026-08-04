/**
 * Supabase Authentication Service
 * Handles user registration, login, password management, and token refresh
 * Note: Password verification is handled by Supabase Auth system
 */

import { supabaseAdmin } from '../config/supabase';
import { User, Session } from '../types/index';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  mapSupabaseError,
} from '../utils/errors';

export class SupabaseAuthService {
  /**
   * Register a new user with email and password
   * Note: This is typically handled by frontend with Supabase.auth.signUp()
   * Backend provides this for API consistency
   */
  async registerUser(
    email: string,
    password: string,
    username: string
  ): Promise<{ user: any; session: Session }> {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        if (error.message?.includes('already')) {
          throw new ConflictError('Email already registered');
        }
        throw mapSupabaseError(error);
      }

      if (!data.user) {
        throw new AuthenticationError('User creation failed');
      }

      // Create user profile in database
      await this.createUserProfile(data.user.id, email, username);
      const profile = await this.getUserProfile(data.user.id);

      return {
        user: profile,
        session: {
          accessToken: '',
          expiresIn: 3600,
          expiresAt: Date.now() + 3600000,
          tokenType: 'Bearer',
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<User> {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('User profile');
        }
        throw mapSupabaseError(error);
      }

      return this.formatProfile(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create user profile in database
   */
  private async createUserProfile(
    userId: string,
    email: string,
    username: string
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        email,
        username,
        favorite_genres: [],
        reading_goal: 12,
      });

      if (error) {
        throw mapSupabaseError(error);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        throw mapSupabaseError(error);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);

      if (error) {
        console.error('Password reset error:', error);
      }
    } catch (error) {
      console.error('Password reset error:', error);
    }
  }

  /**
   * Format profile data to User type
   */
  private formatProfile(data: any): User {
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      avatar: data.avatar || undefined,
      bio: data.bio || undefined,
      favoriteGenres: data.favorite_genres || [],
      readingGoal: data.reading_goal || 12,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const authService = new SupabaseAuthService();
