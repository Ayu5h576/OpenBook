import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { socialService } from '../services/socialService';
import { AuthenticationError } from '../utils/errors';
import { validateData } from '../validators/auth';
import { feedQuerySchema } from '../validators/social';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class SocialController {
  async follow(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const result = await socialService.follow(userId, req.params.userId);
    res.status(201).json(result);
  }

  async unfollow(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const result = await socialService.unfollow(userId, req.params.userId);
    res.json(result);
  }

  async getFollowers(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const targetId = req.params.userId ?? userId;
    const users = await socialService.getFollowers(targetId);
    res.json({ users });
  }

  async getFollowing(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const targetId = req.params.userId ?? userId;
    const users = await socialService.getFollowing(targetId);
    res.json({ users });
  }

  async getStats(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const targetId = req.params.userId ?? userId;
    const stats = await socialService.getSocialStats(targetId);
    res.json({ stats });
  }

  async getFeed(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const query = validateData(feedQuerySchema, req.query);
    const feed = await socialService.getFeed(userId, query);
    res.json(feed);
  }
}

export const socialController = new SocialController();
