/**
 * AI Routes - Express routes for all AI features
 * Handles authentication and delegates to aiController
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { aiController } from '../ai/controllers/aiController';

const router = Router();

// All AI routes require authentication
router.use(authMiddleware);

// Reading Compass - Personalized recommendations
router.post('/reading-compass', (req, res) => aiController.getReadingCompass(req, res));

// Book DNA - Literary analysis
router.post('/book-dna', (req, res) => aiController.getBookDNA(req, res));

// Summaries - Multi-format book summaries
router.post('/summaries', (req, res) => aiController.getSummary(req, res));

// Chat - Q&A with AI about books
router.post('/chat', (req, res) => aiController.chat(req, res));

// Study Pack - Chapter-scoped summary, key ideas, glossary, and quiz
router.post('/study-pack', (req, res) => aiController.getStudyPack(req, res));

// Study Chat - Q&A grounded in the reader's saved highlights/notes
router.post('/study-chat', (req, res) => aiController.studyChatEndpoint(req, res));

// Personal Insights - Reading statistics and analysis
router.post('/insights', (req, res) => aiController.getInsights(req, res));

// Author Insight - "why you might like this author", grounded in the reader's library
router.post('/author-insight', (req, res) => aiController.getAuthorInsight(req, res));

// Smart Planner - Reading schedule generator
router.post('/planner', (req, res) => aiController.getPlanner(req, res));

// Similar Books - Find books similar to a given book
router.post('/search-similar', (req, res) => aiController.searchSimilar(req, res));

export default router;
