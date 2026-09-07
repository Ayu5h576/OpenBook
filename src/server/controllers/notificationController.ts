import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { notificationService } from '../services/notificationService';
import { AuthenticationError } from '../utils/errors';
import { validateData } from '../validators/auth';
import { notificationQuerySchema } from '../validators/notification';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class NotificationController {
  async list(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    // The schema keeps unreadOnly as the literal query string; convert here so
    // the service works with a real boolean.
    const { limit, cursor, unreadOnly } = validateData(notificationQuerySchema, req.query);
    const result = await notificationService.list(userId, {
      limit,
      cursor,
      unreadOnly: unreadOnly === 'true',
    });
    res.json(result);
  }

  async unreadCount(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const result = await notificationService.getUnreadCount(userId);
    res.json(result);
  }

  async markRead(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const result = await notificationService.markRead(userId, req.params.id);
    res.json(result);
  }

  async markAllRead(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const result = await notificationService.markAllRead(userId);
    res.json(result);
  }
}

export const notificationController = new NotificationController();
