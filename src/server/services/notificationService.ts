import { prisma } from '../config/prisma';
import type { NotificationType, Prisma } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import type { NotificationListOptions } from '../validators/notification';

/**
 * Creates a notification addressed to one recipient.
 *
 * Best-effort in the same spirit as recordActivity: a notification write must
 * never break the action that triggered it, so failures are logged and
 * swallowed. Self-directed notifications are dropped — commenting on your own
 * discussion should not ping you.
 */
export async function notify(
  userId: string,
  type: NotificationType,
  options: { actorId?: string | null; metadata?: Prisma.JsonObject } = {}
): Promise<void> {
  if (options.actorId && options.actorId === userId) return;

  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        actorId: options.actorId ?? null,
        metadata: options.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error);
  }
}

export class NotificationService {
  /** Cursor-paginated, newest first. Mirrors the activity feed's pagination. */
  async list(userId: string, { limit, cursor, unreadOnly }: NotificationListOptions) {
    const rows = await prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { readAt: null }) },
      include: {
        actor: { include: { profile: { select: { username: true, avatar: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      notifications: page.map((n) => ({
        id: n.id,
        type: n.type,
        actor: n.actor
          ? {
              id: n.actorId!,
              username: n.actor.profile?.username ?? 'Reader',
              avatar: n.actor.profile?.avatar ?? null,
            }
          : null,
        metadata: (n.metadata as Prisma.JsonObject) ?? {},
        read: n.readAt !== null,
        createdAt: n.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async getUnreadCount(userId: string) {
    const unread = await prisma.notification.count({ where: { userId, readAt: null } });
    return { unread };
  }

  /** Scoped to the caller so one user cannot mark another's notification read. */
  async markRead(userId: string, notificationId: string) {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true, readAt: true },
    });
    if (!existing) throw new NotFoundError('Notification');

    if (!existing.readAt) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: { readAt: new Date() },
      });
    }
    return { read: true };
  }

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}

export const notificationService = new NotificationService();
