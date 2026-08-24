/**
 * NotificationService — unit tests
 *
 * Prisma is mocked. The things worth pinning down here are the privacy and
 * best-effort guarantees: notify() must never throw into its caller, must drop
 * self-directed rows, and markRead must be scoped so one user cannot touch
 * another's notifications.
 *
 * As in socialService.test.ts, notify() is a module-local function called
 * directly by the service's siblings, so it runs for real against the mocked
 * prisma.notification.create — which is what lets us assert the row shape the
 * frontend reads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService, notify } from '../services/notificationService';
import { NotFoundError } from '../utils/errors';

vi.mock('../config/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '../config/prisma';

const service = new NotificationService();

const ME = 'user-me';
const THEM = 'user-them';

function fakeNotification(overrides: Record<string, any> = {}) {
  return {
    id: 'notif-1',
    userId: ME,
    actorId: THEM,
    type: 'FOLLOWED_YOU',
    metadata: { actorUsername: 'priya' },
    readAt: null,
    createdAt: new Date('2026-08-20T10:00:00Z'),
    actor: { profile: { username: 'priya', avatar: null } },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.notification.create as any).mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// notify()
// ---------------------------------------------------------------------------
describe('notify', () => {
  it('writes the recipient, actor, type and metadata', async () => {
    await notify(ME, 'FOLLOWED_YOU', {
      actorId: THEM,
      metadata: { actorUsername: 'priya' },
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: ME,
        type: 'FOLLOWED_YOU',
        actorId: THEM,
        metadata: { actorUsername: 'priya' },
      },
    });
  });

  it('drops self-directed notifications', async () => {
    // Replying to your own discussion should not ping you.
    await notify(ME, 'COMMENTED_ON_DISCUSSION', { actorId: ME });
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('still writes when there is no actor', async () => {
    // A future system-generated notification has no actor; the self-check must
    // not swallow it just because actorId is undefined.
    await notify(ME, 'FOLLOWED_YOU', {});
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ actorId: null }) })
    );
  });

  it('never throws — a failed write must not break the triggering action', async () => {
    (prisma.notification.create as any).mockRejectedValue(new Error('db down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notify(ME, 'FOLLOWED_YOU', { actorId: THEM })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// list()
// ---------------------------------------------------------------------------
describe('NotificationService.list', () => {
  it('scopes to the caller and flattens the actor profile', async () => {
    (prisma.notification.findMany as any).mockResolvedValue([fakeNotification()]);

    const result = await service.list(ME, { limit: 20, unreadOnly: false });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ME } })
    );
    expect(result.notifications[0]).toEqual({
      id: 'notif-1',
      type: 'FOLLOWED_YOU',
      actor: { id: THEM, username: 'priya', avatar: null },
      metadata: { actorUsername: 'priya' },
      read: false,
      createdAt: '2026-08-20T10:00:00.000Z',
    });
  });

  it('adds readAt: null to the filter only when unreadOnly is set', async () => {
    (prisma.notification.findMany as any).mockResolvedValue([]);

    await service.list(ME, { limit: 20, unreadOnly: true });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ME, readAt: null } })
    );
  });

  it('reports a read notification as read', async () => {
    (prisma.notification.findMany as any).mockResolvedValue([
      fakeNotification({ readAt: new Date('2026-08-21T09:00:00Z') }),
    ]);

    const result = await service.list(ME, { limit: 20, unreadOnly: false });
    expect(result.notifications[0].read).toBe(true);
  });

  it('survives a deleted actor (actorId nulled by SET NULL)', async () => {
    (prisma.notification.findMany as any).mockResolvedValue([
      fakeNotification({ actorId: null, actor: null }),
    ]);

    const result = await service.list(ME, { limit: 20, unreadOnly: false });
    expect(result.notifications[0].actor).toBeNull();
  });

  it('over-fetches by one and returns the last id as the cursor', async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      fakeNotification({ id: `notif-${i + 1}` })
    );
    (prisma.notification.findMany as any).mockResolvedValue(rows);

    const result = await service.list(ME, { limit: 2, unreadOnly: false });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
    expect(result.notifications).toHaveLength(2);
    expect(result.nextCursor).toBe('notif-2');
  });

  it('returns a null cursor on the last page', async () => {
    (prisma.notification.findMany as any).mockResolvedValue([fakeNotification()]);

    const result = await service.list(ME, { limit: 20, unreadOnly: false });
    expect(result.nextCursor).toBeNull();
  });

  it('skips the cursor row so it is not returned twice', async () => {
    (prisma.notification.findMany as any).mockResolvedValue([]);

    await service.list(ME, { limit: 20, cursor: 'notif-9', unreadOnly: false });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 'notif-9' }, skip: 1 })
    );
  });
});

// ---------------------------------------------------------------------------
// markRead / markAllRead / getUnreadCount
// ---------------------------------------------------------------------------
describe('NotificationService.markRead', () => {
  it('looks the row up scoped to the caller', async () => {
    (prisma.notification.findFirst as any).mockResolvedValue({ id: 'notif-1', readAt: null });
    (prisma.notification.update as any).mockResolvedValue({});

    await service.markRead(ME, 'notif-1');

    // The userId in the where clause is what stops one user marking another's
    // notification read.
    expect(prisma.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'notif-1', userId: ME } })
    );
    expect(prisma.notification.update).toHaveBeenCalled();
  });

  it("throws NotFoundError for another user's notification", async () => {
    (prisma.notification.findFirst as any).mockResolvedValue(null);

    await expect(service.markRead(ME, 'notif-other')).rejects.toThrow(NotFoundError);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('does not rewrite readAt on an already-read notification', async () => {
    (prisma.notification.findFirst as any).mockResolvedValue({
      id: 'notif-1',
      readAt: new Date('2026-08-21T09:00:00Z'),
    });

    const result = await service.markRead(ME, 'notif-1');

    expect(prisma.notification.update).not.toHaveBeenCalled();
    expect(result).toEqual({ read: true });
  });
});

describe('NotificationService.markAllRead', () => {
  it('updates only the caller’s unread rows and returns the count', async () => {
    (prisma.notification.updateMany as any).mockResolvedValue({ count: 4 });

    const result = await service.markAllRead(ME);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ME, readAt: null } })
    );
    expect(result).toEqual({ updated: 4 });
  });
});

describe('NotificationService.getUnreadCount', () => {
  it('counts unread rows for the caller', async () => {
    (prisma.notification.count as any).mockResolvedValue(2);

    const result = await service.getUnreadCount(ME);

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: ME, readAt: null },
    });
    expect(result).toEqual({ unread: 2 });
  });
});
