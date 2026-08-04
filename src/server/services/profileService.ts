/**
 * User Profile Service
 * Handles profile updates, lookups, and validations
 */

import { supabaseAdmin } from '../config/supabase';
import { User, ProfileUpdateData } from '../types/index';
import { ConflictError, NotFoundError, mapSupabaseError } from '../utils/errors';

export class ProfileService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<User> {
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
   * Update user profile
   */
  async updateProfile(userId: string, data: ProfileUpdateData): Promise<User> {
    try {
      // Check if username is being changed and if it's available
      if (data.username) {
        const isAvailable = await this.isUsernameAvailable(data.username, userId);
        if (!isAvailable) {
          throw new ConflictError('Username already taken');
        }
      }

      const updateData: any = {};

      if (data.username !== undefined) updateData.username = data.username;
      if (data.avatar !== undefined) updateData.avatar = data.avatar;
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.favoriteGenres !== undefined) updateData.favorite_genres = data.favoriteGenres;
      if (data.readingGoal !== undefined) updateData.reading_goal = data.readingGoal;

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        throw mapSupabaseError(error);
      }

      return this.getProfile(userId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('username', username);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { count, error } = await query;

      if (error) {
        throw mapSupabaseError(error);
      }

      return (count || 0) === 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('email', email);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { count, error } = await query;

      if (error) {
        throw mapSupabaseError(error);
      }

      return (count || 0) === 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user profile by username (for public profile views)
   */
  async getProfileByUsername(username: string): Promise<User> {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(`User "${username}"`);
        }
        throw mapSupabaseError(error);
      }

      return this.formatProfile(data);
    } catch (error) {
      throw error;
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

export const profileService = new ProfileService();
