/**
 * User Profile Service
 * Handles profile lookups and updates
 */

import { prisma } from '../config/prisma';
import { User, ProfileUpdateData } from '../types/index';
import { ConflictError, NotFoundError, mapPrismaError } from '../utils/errors';

type ProfileWithUser = {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  favoriteGenres: string[];
  readingGoal: number;
  createdAt: Date;
  updatedAt: Date;
  user: { email: string };
};

export class ProfileService {
  async getProfile(userId: string): Promise<User> {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      include: { user: { select: { email: true } } },
    });

    if (!profile) {
      throw new NotFoundError('User profile');
    }

    return this.formatProfile(profile);
  }

  async updateProfile(userId: string, data: ProfileUpdateData): Promise<User> {
    if (data.username) {
      const isAvailable = await this.isUsernameAvailable(data.username, userId);
      if (!isAvailable) {
        throw new ConflictError('Username already taken');
      }
    }

    try {
      const profile = await prisma.profile.update({
        where: { id: userId },
        data: {
          ...(data.username !== undefined && { username: data.username }),
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.favoriteGenres !== undefined && { favoriteGenres: data.favoriteGenres }),
          ...(data.readingGoal !== undefined && { readingGoal: data.readingGoal }),
        },
        include: { user: { select: { email: true } } },
      });

      return this.formatProfile(profile);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const count = await prisma.profile.count({
      where: {
        username,
        ...(excludeUserId && { id: { not: excludeUserId } }),
      },
    });

    return count === 0;
  }

  private formatProfile(profile: ProfileWithUser): User {
    return {
      id: profile.id,
      email: profile.user.email,
      username: profile.username,
      avatar: profile.avatar || undefined,
      bio: profile.bio || undefined,
      favoriteGenres: profile.favoriteGenres,
      readingGoal: profile.readingGoal,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}

export const profileService = new ProfileService();
