import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { analyticsService } from '../services/analyticsService';
import { validateData } from '../validators/auth';
import { upsertGoalSchema } from '../validators/books';
import { AuthenticationError } from '../utils/errors';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class AnalyticsController {
  async getStats(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const stats = await analyticsService.getStats(userId);
    res.json({ stats });
  }

  async getGoal(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const goal = await analyticsService.getGoal(userId, year);
    res.json({ goal: goal ?? null });
  }

  async upsertGoal(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(upsertGoalSchema, req.body);
    const goal = await analyticsService.upsertGoal(userId, input);
    res.json({ goal });
  }
}

export const analyticsController = new AnalyticsController();
