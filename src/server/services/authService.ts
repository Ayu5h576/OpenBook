/**
 * Authentication Service
 * Owns registration, credential verification, session issuance, and rotation.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { User, Session } from '../types/index';
import { AuthenticationError, NotFoundError, mapPrismaError } from '../utils/errors';
import {
  accessTokenExpiresIn,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../utils/tokens';

const BCRYPT_ROUNDS = 12;

// Compared against when the email is unknown, so a missing account costs the
// same time as a wrong password and the endpoint can't be used to enumerate users.
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash('unused-placeholder-password', BCRYPT_ROUNDS);
  return dummyHash;
}

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

export class AuthService {
  /**
   * Register a new user and issue an initial session.
   */
  async registerUser(
    email: string,
    password: string,
    username: string
  ): Promise<{ user: User; session: Session; refreshToken: string }> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let profile: ProfileWithUser;

    try {
      profile = await prisma.profile.create({
        data: {
          username,
          user: {
            create: { email, passwordHash },
          },
        },
        include: { user: { select: { email: true } } },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }

    const session = await this.issueSession(profile.id, email);

    return { user: this.formatProfile(profile), ...session };
  }

  /**
   * Verify credentials and issue a session.
   */
  async loginUser(
    email: string,
    password: string
  ): Promise<{ user: User; session: Session; refreshToken: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    // Hash a throwaway value when the email is unknown so both branches take
    // comparable time and the response can't be used to enumerate accounts.
    const passwordMatches = await bcrypt.compare(
      password,
      user ? user.passwordHash : await getDummyHash()
    );

    if (!user || !passwordMatches) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.profile) {
      throw new NotFoundError('User profile');
    }

    const session = await this.issueSession(user.id, user.email);

    return {
      user: this.formatProfile({ ...user.profile, user: { email: user.email } }),
      ...session,
    };
  }

  /**
   * Rotate a refresh token: revoke the presented one and issue a fresh pair.
   */
  async refreshSession(
    token: string
  ): Promise<{ user: User; session: Session; refreshToken: string }> {
    const tokenHash = hashRefreshToken(token);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { profile: true } } },
    });

    if (!stored) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // A revoked token being presented again means it leaked after rotation.
    // Revoke the whole family so the attacker and the victim are both cut off.
    if (stored.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AuthenticationError('Refresh token has been revoked');
    }

    if (stored.expiresAt < new Date()) {
      throw new AuthenticationError('Refresh token has expired');
    }

    if (!stored.user.profile) {
      throw new NotFoundError('User profile');
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const session = await this.issueSession(stored.userId, stored.user.email);

    return {
      user: this.formatProfile({
        ...stored.user.profile,
        user: { email: stored.user.email },
      }),
      ...session,
    };
  }

  /**
   * Revoke a single refresh token. Unknown tokens are ignored - logout is
   * idempotent and shouldn't fail a client that already lost its session.
   */
  async logout(token: string | undefined): Promise<void> {
    if (!token) return;

    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getUserProfile(userId: string): Promise<User> {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      include: { user: { select: { email: true } } },
    });

    if (!profile) {
      throw new NotFoundError('User profile');
    }

    return this.formatProfile(profile);
  }

  /**
   * Change a user's password and invalidate every existing session.
   */
  async changePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    try {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
        prisma.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  /**
   * Password reset request.
   * TODO: no mail provider is configured, so this cannot deliver a reset link.
   * The endpoint exists so the flow is in place once a mailer is added.
   */
  async forgotPassword(email: string): Promise<void> {
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (exists) {
      console.warn(
        `[Auth] Password reset requested for ${email} but no mail provider is configured.`
      );
    }
  }

  private async issueSession(
    userId: string,
    email: string
  ): Promise<{ session: Session; refreshToken: string }> {
    const accessToken = await signAccessToken(userId, email);
    const refreshToken = generateRefreshToken();
    const expiresIn = accessTokenExpiresIn();

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshTokenExpiry(),
      },
    });

    return {
      session: {
        accessToken,
        expiresIn,
        expiresAt: Date.now() + expiresIn * 1000,
        tokenType: 'Bearer',
      },
      refreshToken,
    };
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

export const authService = new AuthService();
