/**
 * ProfileService — unit tests
 *
 * Covers: getProfile (happy path + not found), updateProfile (happy path,
 * username conflict, update with no username change), isUsernameAvailable.
 * Prisma is fully mocked — no database required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../services/profileService';
import { ConflictError, NotFoundError } from '../utils/errors';

vi.mock('../config/prisma', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '../config/prisma';

const profileService = new ProfileService();

const USER_ID = 'user-abc';
const EMAIL = 'reader@openbook.app';

/** Minimal profile row that Prisma would return (with the user join). */
const makeProfile = (overrides: Partial<{
  username: string;
  avatar: string | null;
  bio: string | null;
  favoriteGenres: string[];
  readingGoal: number;
}> = {}) => ({
  id: USER_ID,
  username: 'booklover',
  avatar: null,
  bio: null,
  favoriteGenres: ['Fantasy'],
  readingGoal: 12,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-06-01'),
  user: { email: EMAIL },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getProfile
// ---------------------------------------------------------------------------
describe('ProfileService.getProfile', () => {
  it('returns a formatted User when the profile exists', async () => {
    (prisma.profile.findUnique as any).mockResolvedValue(makeProfile());

    const user = await profileService.getProfile(USER_ID);

    expect(user).toMatchObject({
      id: USER_ID,
      email: EMAIL,
      username: 'booklover',
      favoriteGenres: ['Fantasy'],
      readingGoal: 12,
    });
    // Dates are ISO strings, not Date objects
    expect(typeof user.createdAt).toBe('string');
    expect(typeof user.updatedAt).toBe('string');
  });

  it('strips null avatar/bio from the returned object', async () => {
    (prisma.profile.findUnique as any).mockResolvedValue(makeProfile({ avatar: null, bio: null }));

    const user = await profileService.getProfile(USER_ID);

    // formatProfile converts null to undefined (omitted)
    expect(user.avatar).toBeUndefined();
    expect(user.bio).toBeUndefined();
  });

  it('includes avatar and bio when they are set', async () => {
    (prisma.profile.findUnique as any).mockResolvedValue(
      makeProfile({ avatar: 'https://cdn.example.com/av.jpg', bio: 'Avid reader' })
    );

    const user = await profileService.getProfile(USER_ID);

    expect(user.avatar).toBe('https://cdn.example.com/av.jpg');
    expect(user.bio).toBe('Avid reader');
  });

  it('throws NotFoundError when no profile exists', async () => {
    (prisma.profile.findUnique as any).mockResolvedValue(null);

    await expect(profileService.getProfile(USER_ID)).rejects.toThrow(NotFoundError);
  });

  it('queries Prisma with the correct userId and user email join', async () => {
    (prisma.profile.findUnique as any).mockResolvedValue(makeProfile());

    await profileService.getProfile(USER_ID);

    expect(prisma.profile.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      include: { user: { select: { email: true } } },
    });
  });
});

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------
describe('ProfileService.updateProfile', () => {
  it('updates the profile when no username change is requested', async () => {
    (prisma.profile.update as any).mockResolvedValue(makeProfile({ bio: 'New bio' }));

    const user = await profileService.updateProfile(USER_ID, { bio: 'New bio' });

    // isUsernameAvailable must not have been called
    expect(prisma.profile.count).not.toHaveBeenCalled();
    expect(user.bio).toBe('New bio');
  });

  it('checks username availability when a new username is requested', async () => {
    (prisma.profile.count as any).mockResolvedValue(0); // available
    (prisma.profile.update as any).mockResolvedValue(makeProfile({ username: 'newname' }));

    await profileService.updateProfile(USER_ID, { username: 'newname' });

    expect(prisma.profile.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ username: 'newname' }) })
    );
  });

  it('throws ConflictError when the requested username is already taken', async () => {
    (prisma.profile.count as any).mockResolvedValue(1); // already taken

    await expect(
      profileService.updateProfile(USER_ID, { username: 'takenname' })
    ).rejects.toThrow(ConflictError);
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it('excludes the current user from the uniqueness check', async () => {
    (prisma.profile.count as any).mockResolvedValue(0);
    (prisma.profile.update as any).mockResolvedValue(makeProfile({ username: 'samename' }));

    await profileService.updateProfile(USER_ID, { username: 'samename' });

    expect(prisma.profile.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: USER_ID } }),
      })
    );
  });

  it('only sends defined fields to Prisma', async () => {
    (prisma.profile.count as any).mockResolvedValue(0);
    (prisma.profile.update as any).mockResolvedValue(makeProfile({ readingGoal: 24 }));

    await profileService.updateProfile(USER_ID, { username: 'newname', readingGoal: 24 });

    const data = (prisma.profile.update as any).mock.calls[0][0].data;
    expect(data).toHaveProperty('username', 'newname');
    expect(data).toHaveProperty('readingGoal', 24);
    // Fields not in the update payload must be absent
    expect(data).not.toHaveProperty('avatar');
    expect(data).not.toHaveProperty('bio');
  });
});

// ---------------------------------------------------------------------------
// isUsernameAvailable
// ---------------------------------------------------------------------------
describe('ProfileService.isUsernameAvailable', () => {
  it('returns true when no profile uses the username', async () => {
    (prisma.profile.count as any).mockResolvedValue(0);

    await expect(profileService.isUsernameAvailable('unique')).resolves.toBe(true);
  });

  it('returns false when another profile already has the username', async () => {
    (prisma.profile.count as any).mockResolvedValue(1);

    await expect(profileService.isUsernameAvailable('taken')).resolves.toBe(false);
  });

  it('excludes the given userId from the count when provided', async () => {
    (prisma.profile.count as any).mockResolvedValue(0);

    await profileService.isUsernameAvailable('myname', USER_ID);

    expect(prisma.profile.count).toHaveBeenCalledWith({
      where: { username: 'myname', id: { not: USER_ID } },
    });
  });

  it('does not add an id filter when excludeUserId is absent', async () => {
    (prisma.profile.count as any).mockResolvedValue(0);

    await profileService.isUsernameAvailable('checkme');

    const { where } = (prisma.profile.count as any).mock.calls[0][0];
    expect(where).not.toHaveProperty('id');
  });
});
