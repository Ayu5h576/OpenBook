/**
 * AuthService — unit tests
 *
 * Prisma is mocked so these tests run without a real database.
 * Token signing/verification uses the real jose library to catch JWT regressions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/authService';
import { AuthenticationError, ConflictError, NotFoundError } from '../utils/errors';

// ---------------------------------------------------------------------------
// Mock Prisma (all tests in this file use the same mock)
// ---------------------------------------------------------------------------
vi.mock('../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    profile: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
  },
}));

// ---------------------------------------------------------------------------
// Import mocked prisma AFTER vi.mock so the mock is in place
// ---------------------------------------------------------------------------
import { prisma } from '../config/prisma';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FAKE_PROFILE = {
  id: 'user-1',
  username: 'bookworm',
  avatar: null,
  bio: null,
  favoriteGenres: [],
  readingGoal: 12,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  user: { email: 'test@openbook.app' },
};

const FAKE_USER = {
  id: 'user-1',
  email: 'test@openbook.app',
  // bcrypt hash of "password123" with 12 rounds (precomputed to keep tests fast)
  passwordHash: '$2a$12$Xn3wQ.rGQZ2A5Xx5VhmZeOC9GBE.JZTJrz1Yr6HPuPg2w/vCxHv5S',
  profile: FAKE_PROFILE,
};

function fakeTokenRow(overrides: Record<string, any> = {}) {
  return {
    id: 'tok-1',
    userId: 'user-1',
    tokenHash: 'dummy-hash',
    expiresAt: new Date(Date.now() + 86400 * 1000),
    revokedAt: null,
    user: { email: 'test@openbook.app', profile: FAKE_PROFILE },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    vi.clearAllMocks();
  });

  // ---- registerUser --------------------------------------------------------
  describe('registerUser', () => {
    it('creates a profile and returns a user + tokens', async () => {
      vi.mocked(prisma.profile.create).mockResolvedValue(FAKE_PROFILE as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const result = await service.registerUser('test@openbook.app', 'password123', 'bookworm');

      expect(prisma.profile.create).toHaveBeenCalledOnce();
      expect(result.user.email).toBe('test@openbook.app');
      expect(result.user.username).toBe('bookworm');
      expect(result.session.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('propagates Prisma ConflictError when email/username is taken', async () => {
      const prismaConflict = Object.assign(new Error('Unique constraint'), { code: 'P2002', meta: { target: ['email'] } });
      vi.mocked(prisma.profile.create).mockRejectedValue(prismaConflict);

      await expect(service.registerUser('dupe@openbook.app', 'pass', 'user')).rejects.toBeInstanceOf(ConflictError);
    });
  });

  // ---- loginUser -----------------------------------------------------------
  describe('loginUser', () => {
    it('returns user + tokens for correct credentials', async () => {
      // Use a known bcrypt hash for "correct-password"
      const hash = await import('bcryptjs').then((b) => b.hash('correct-password', 10));
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...FAKE_USER,
        passwordHash: hash,
      } as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const result = await service.loginUser('test@openbook.app', 'correct-password');
      expect(result.user.email).toBe('test@openbook.app');
      expect(result.session.accessToken).toBeTruthy();
    });

    it('throws AuthenticationError for wrong password', async () => {
      const hash = await import('bcryptjs').then((b) => b.hash('real-password', 10));
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...FAKE_USER,
        passwordHash: hash,
      } as any);

      await expect(service.loginUser('test@openbook.app', 'wrong-password')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('throws AuthenticationError for unknown email (timing-safe path)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(service.loginUser('nobody@openbook.app', 'any')).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  // ---- refreshSession ------------------------------------------------------
  describe('refreshSession', () => {
    it('rotates the token and returns a fresh pair', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(fakeTokenRow() as any);
      vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const result = await service.refreshSession('any-valid-token');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) } })
      );
      expect(result.session.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('throws AuthenticationError for unknown token', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null);
      await expect(service.refreshSession('bogus')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('kills entire token family when a revoked token is presented (theft detection)', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(
        fakeTokenRow({ revokedAt: new Date() }) as any
      );
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 2 } as any);

      await expect(service.refreshSession('stolen-token')).rejects.toBeInstanceOf(AuthenticationError);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) } })
      );
    });

    it('throws AuthenticationError for expired token', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(
        fakeTokenRow({ expiresAt: new Date(Date.now() - 1000) }) as any
      );

      await expect(service.refreshSession('expired-token')).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  // ---- logout --------------------------------------------------------------
  describe('logout', () => {
    it('revokes the provided refresh token', async () => {
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as any);
      await service.logout('some-token');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledOnce();
    });

    it('is idempotent — does nothing when token is undefined', async () => {
      await service.logout(undefined);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  // ---- getUserProfile ------------------------------------------------------
  describe('getUserProfile', () => {
    it('returns the formatted user profile', async () => {
      vi.mocked(prisma.profile.findUnique).mockResolvedValue(FAKE_PROFILE as any);
      const user = await service.getUserProfile('user-1');
      expect(user.id).toBe('user-1');
      expect(user.username).toBe('bookworm');
    });

    it('throws NotFoundError when profile is missing', async () => {
      vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);
      await expect(service.getUserProfile('nobody')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
