import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { bookClubService } from '../services/bookClubService';
import { achievementService } from '../services/achievementService';
import { AuthenticationError } from '../utils/errors';
import { validateData } from '../validators/auth';
import {
  createClubSchema,
  updateClubSchema,
  createDiscussionSchema,
  createCommentSchema,
} from '../validators/social';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

export class BookClubController {
  async listClubs(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const clubs = await bookClubService.listClubs(userId);
    res.json({ clubs });
  }

  async getClub(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const club = await bookClubService.getClub(userId, req.params.clubId);
    res.json({ club });
  }

  async createClub(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(createClubSchema, req.body);
    const club = await bookClubService.createClub(userId, input);
    res.status(201).json({ club });
  }

  async updateClub(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(updateClubSchema, req.body);
    const club = await bookClubService.updateClub(userId, req.params.clubId, input);
    res.json({ club });
  }

  async deleteClub(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    await bookClubService.deleteClub(userId, req.params.clubId);
    res.json({ message: 'Club deleted' });
  }

  async joinClub(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const club = await bookClubService.joinClub(userId, req.params.clubId);
    res.status(201).json({ club });
  }

  async leaveClub(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const result = await bookClubService.leaveClub(userId, req.params.clubId);
    res.json(result);
  }

  async listDiscussions(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const discussions = await bookClubService.listDiscussions(userId, req.params.clubId);
    res.json({ discussions });
  }

  async createDiscussion(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(createDiscussionSchema, req.body);
    const discussion = await bookClubService.createDiscussion(userId, req.params.clubId, input);
    res.status(201).json({ discussion });
  }

  async getDiscussion(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const discussion = await bookClubService.getDiscussion(
      userId,
      req.params.clubId,
      req.params.discussionId
    );
    res.json({ discussion });
  }

  async addComment(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(createCommentSchema, req.body);
    const comment = await bookClubService.addComment(
      userId,
      req.params.clubId,
      req.params.discussionId,
      input
    );
    res.status(201).json({ comment });
  }
}

export const bookClubController = new BookClubController();

export class AchievementController {
  async getAchievements(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const result = await achievementService.getAchievements(userId);
    res.json(result);
  }
}

export const achievementController = new AchievementController();
