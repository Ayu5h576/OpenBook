import { createHash } from 'crypto';
import { Response } from 'express';
import type { AuthenticatedRequest } from '../../types/index';
import { validateData } from '../../validators/auth';
import type {
  AuthorInsight,
  AuthorInsightBody,
  AuthorInsightResponse,
  BookDNAResponse,
  ChatResponse,
  InsightsResponse,
  PlannerResponse,
  ReadingCompassResponse,
  StudyPackBody,
  StudyPackResponse,
  SummaryResponse,
} from '../../types/ai';
import { aiService } from '../services/aiService';
import { aiDataService } from '../services/aiDataService';
import { noteService } from '../../services/noteService';
import { authorService } from '../../services/authorService';
import { authorKey } from '../../services/authorProfile';
import { conversationHistoryManager } from '../services/conversationHistoryManager';
import { promptTemplates } from '../templates/prompts';
import {
  authorInsightSystemInstruction,
  buildAuthorInsightFallback,
  buildAuthorInsightPrompt,
  formatAuthorInsight,
} from '../author/authorPrompts';
import {
  buildAnnotatedChatPrompt,
  buildStudyPackFallback,
  buildStudyPackPrompt,
  collectPassages,
  extractCitations,
  formatStudyPack,
  studyPackSystemInstruction,
} from '../study/studyPrompts';
// CacheManager is still the source of cache keys + TTL constants; cacheService
// is the storage layer (Redis when configured, file cache otherwise).
import { CacheManager } from '../cache/cacheManager';
import { cacheService } from '../../cache/cacheService';
import { rateLimiter } from '../utils/rateLimiter';
import {
  buildPersonalizedInsightsFallback,
  buildPersonalizedReadingCompassFallback,
  buildPlannerFallback,
  getOfflineFallback,
} from '../utils/offlineFallback';
import {
  formatBookDNA,
  formatChat,
  formatInsights,
  formatPlanner,
  formatReadingCompass,
  formatSummary,
  parseJsonResponse,
} from '../utils/responseFormatter';
import * as validators from '../validators/aiValidators';
import type { ChatInput } from '../validators/aiValidators';

type AIFeature =
  | 'reading-compass'
  | 'book-dna'
  | 'summary'
  | 'chat'
  | 'insights'
  | 'planner'
  | 'similar-books'
  | 'study-pack'
  | 'study-chat'
  | 'author-insight';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.userId) {
    throw new Error('Authenticated user missing from request');
  }
  return req.userId;
}

export class AIController {
  private async generateJson<T>(userId: string, feature: AIFeature, prompt: string, fallback: T, systemInstruction: string): Promise<T> {
    if (!aiService.isAvailable()) {
      return fallback;
    }

    try {
      const result = await aiService.generateContent({
        prompt,
        responseFormat: 'json',
        systemInstruction,
        temperature: 0.4,
      });
      await aiService.logUsage({
        userId,
        feature,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        cost: 0,
        timestamp: new Date().toISOString(),
        success: true,
      });
      return parseJsonResponse(result.text, fallback);
    } catch (error) {
      await aiService.logUsage({
        userId,
        feature,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown AI error',
      });
      return fallback;
    }
  }

  private async generateText(userId: string, feature: AIFeature, prompt: string, fallback: string, systemInstruction: string): Promise<string> {
    if (!aiService.isAvailable()) {
      return fallback;
    }

    try {
      const result = await aiService.generateContent({
        prompt,
        systemInstruction,
        temperature: 0.5,
      });
      await aiService.logUsage({
        userId,
        feature,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        cost: 0,
        timestamp: new Date().toISOString(),
        success: true,
      });
      return result.text;
    } catch (error) {
      await aiService.logUsage({
        userId,
        feature,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown AI error',
      });
      return fallback;
    }
  }

  async getReadingCompass(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.readingCompassSchema, req.body);

    if (!(await rateLimiter.isAllowed(userId, 20))) {
      return res.status(429).json({ error: 'Rate limit exceeded', remaining: 0 });
    }

    const cacheKey = CacheManager.getCacheKey('reading-compass', userId, { genres: input.genres, limit: input.limit });
    if (input.useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return res.json({ ...cached, fromCache: true });
    }

    const profile = await aiDataService.getUserReadingProfile(userId);
    const fallback = buildPersonalizedReadingCompassFallback(profile, input.limit);
    const raw = await this.generateJson(userId, 'reading-compass', promptTemplates.readingCompass(profile, input.limit), fallback, 'You are an expert literary curator. Return valid JSON only.');
    const result: ReadingCompassResponse = formatReadingCompass(raw);

    await cacheService.set(cacheKey, result, CacheManager.TTLs.RECOMMENDATIONS);
    return res.json(result);
  }

  async getBookDNA(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.bookDNASchema, req.body);

    if (!(await rateLimiter.isAllowed(userId))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const cacheKey = CacheManager.getCacheKey('book-dna', userId, { bookId: input.bookId });
    if (input.useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return res.json({ ...cached, fromCache: true });
    }

    const book = await aiDataService.getBookWithUserContext(input.bookId, userId);
    const fallback = getOfflineFallback('book-dna').dna;
    const raw = await this.generateJson(userId, 'book-dna', promptTemplates.bookDNA(book), fallback, 'You are a literary analyst. Return valid JSON only.');
    const result: BookDNAResponse = formatBookDNA(raw, book);

    await cacheService.set(cacheKey, result, CacheManager.TTLs.BOOK_DNA);
    return res.json(result);
  }

  async getSummary(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.summarySchema, req.body);

    if (!(await rateLimiter.isAllowed(userId))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const cacheKey = CacheManager.getCacheKey('summary', userId, {
      bookId: input.bookId,
      format: input.format,
      spoilerLevel: input.spoilerLevel,
    });
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const book = await aiDataService.getBookWithUserContext(input.bookId, userId);
    const prompt = promptTemplates.summary(book, input.format, input.spoilerLevel);
    const fallback = `Offline summary unavailable for ${book.title}. OpenBook has catalog metadata and your notes, but Gemini is not configured right now.`;
    const summary = await this.generateText(userId, 'summary', prompt, fallback, 'You summarize books for a personal reading assistant. Avoid spoilers unless requested.');
    const result: SummaryResponse = formatSummary(input.format, summary);

    await cacheService.set(cacheKey, result, CacheManager.TTLs.SUMMARIES);
    return res.json(result);
  }

  async getStudyPack(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.studyPackSchema, req.body);

    if (!(await rateLimiter.isAllowed(userId))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // The chapter text is client-supplied but deterministic per book + chapter
    // (the reader always derives chapter 1 from the book description), so the
    // cache key holds only coordinates, never raw chapter text.
    const cacheKey = CacheManager.getCacheKey('study-pack', userId, {
      bookId: input.bookId,
      chapterNum: input.chapterNum,
    });
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const book = await aiDataService.getBookWithUserContext(input.bookId, userId);
    const fallback = buildStudyPackFallback(book, input.chapterNum);
    const prompt = buildStudyPackPrompt(book, input.chapterNum, input.chapterText, input.chapterTitle);
    const body = await this.generateJson<StudyPackBody>(
      userId,
      'study-pack',
      prompt,
      fallback,
      studyPackSystemInstruction
    );
    const pack = formatStudyPack(body, input.bookId, input.chapterNum);
    const result: StudyPackResponse = { pack, generatedAt: new Date().toISOString() };

    await cacheService.set(cacheKey, result, CacheManager.TTLs.BOOK_DNA);
    return res.json(result);
  }

  async chat(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.chatSchema, req.body);

    if (!(await rateLimiter.isAllowed(userId, 50))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const book = input.bookId ? await aiDataService.getBookWithUserContext(input.bookId, userId) : null;
    const profile = await aiDataService.getUserReadingProfile(userId);
    const conversationId = conversationHistoryManager.getConversationId(userId, input.bookId, input.conversationId);
    const history = conversationHistoryManager.getMessages(conversationId);
    conversationHistoryManager.append(conversationId, { role: 'user', content: input.message, bookId: input.bookId });

    const prompt = promptTemplates.bookChat(input.message, book, profile, history, input.context);
    const fallback = book
      ? `I am offline right now, but I can still anchor this to your saved book: ${book.title}. Your question was: "${input.message}".`
      : `I am offline right now. Add a book context or try again when Gemini is available.`;
    const response = await this.generateText(userId, 'chat', prompt, fallback, 'You are a spoiler-aware book companion. Use only provided user/book context.');

    conversationHistoryManager.append(conversationId, { role: 'assistant', content: response, bookId: input.bookId });
    const result: ChatResponse = formatChat(response, conversationId);
    return res.json(result);
  }

  // Study-chat: the same conversation, grounded in the reader's own saved
  // highlights/notes for the active chapter. Answers surface which passages
  // they drew on, and ownership of the entry is re-checked server-side.
  private async studyChat(req: AuthenticatedRequest, res: Response, userId: string, input: ChatInput) {
    const book = input.bookId ? await aiDataService.getBookWithUserContext(input.bookId, userId) : null;
    // Study chat keeps its own user-scoped thread: the free-form /chat history
    // must never bleed into (or be contaminated by) a conversation whose system
    // prompt restricts the model to the reader's saved highlights and notes.
    const conversationId =
      input.conversationId ?? `${userId}:study:${input.bookId ?? 'general'}`;
    const history = conversationHistoryManager.getMessages(conversationId);
    conversationHistoryManager.append(conversationId, { role: 'user', content: input.message, bookId: input.bookId });

    const [notes, highlights] = await Promise.all([
      noteService.getNotes(userId, input.entryId!),
      noteService.getHighlights(userId, input.entryId!),
    ]);
    const passages = collectPassages(highlights, notes, input.chapterNum);

    const prompt = buildAnnotatedChatPrompt({ message: input.message, book, context: input.context, history, passages });
    const fallback = book
      ? `I am offline right now, but I can still anchor this to your saved book: ${book.title}. Your question was: "${input.message}".`
      : `I am offline right now. Add a book context or try again when Gemini is available.`;
    const modelText = await this.generateText(
      userId,
      'study-chat',
      prompt,
      fallback,
      "You are a spoiler-aware book companion. Answer only from the reader's saved highlights, notes, and book context provided."
    );

    const { response, citations } = extractCitations(modelText, passages);
    conversationHistoryManager.append(conversationId, { role: 'assistant', content: response, bookId: input.bookId });
    const result: ChatResponse = { response, conversationId, generatedAt: new Date().toISOString() };
    if (citations.length > 0) result.citations = citations;
    return res.json(result);
  }

  async studyChatEndpoint(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.chatSchema, req.body);

    if (!input.entryId) {
      return res.status(400).json({ error: 'Study chat requires a library entryId to ground answers in your highlights.' });
    }

    if (!(await rateLimiter.isAllowed(userId, 50))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    return this.studyChat(req, res, userId, input);
  }

  /**
   * "Why you might like this author" for the author page.
   *
   * The profile is rebuilt server-side from the reader's own library rather than
   * accepted from the request, so the model can only reason over facts we hold.
   * Everything it returns is checked back against that profile by
   * `formatAuthorInsight` before it reaches the page.
   */
  async getAuthorInsight(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.authorInsightSchema, req.body);

    if (!(await rateLimiter.isAllowed(userId))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // The author name is free text, and the file cache backend collapses
    // punctuation in keys ("a b" and "a-b" collide), so it is hashed rather
    // than interpolated. 24h, not the 7d a biography gets: the reader's own
    // history is half the input and changes as they read.
    const cacheKey = CacheManager.getCacheKey('author-insight', userId, {
      author: createHash('sha1').update(authorKey(input.author)).digest('hex'),
    });
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const profile = await authorService.getProfile(input.author, userId);
    const fallback = buildAuthorInsightFallback(profile);
    const prompt = buildAuthorInsightPrompt(profile);

    const body = await this.generateJson<AuthorInsightBody>(
      userId,
      'author-insight',
      prompt,
      fallback,
      authorInsightSystemInstruction
    );
    const insight: AuthorInsight = formatAuthorInsight(body, profile);
    const result: AuthorInsightResponse = { insight, generatedAt: new Date().toISOString() };

    await cacheService.set(cacheKey, result, CacheManager.TTLs.INSIGHTS);
    return res.json(result);
  }

  async getInsights(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.insightsSchema, req.body);

    if (!(await rateLimiter.isAllowed(userId))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const cacheKey = CacheManager.getCacheKey('insights', userId);
    if (input.useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return res.json({ ...cached, fromCache: true });
    }

    const profile = await aiDataService.getUserReadingProfile(userId);
    const fallback = buildPersonalizedInsightsFallback(profile);
    const raw = await this.generateJson(userId, 'insights', promptTemplates.personalInsights(profile), fallback, 'You are a reading coach. Return valid JSON only.');
    const result: InsightsResponse = formatInsights(raw);

    await cacheService.set(cacheKey, result, CacheManager.TTLs.INSIGHTS);
    return res.json(result);
  }

  async getPlanner(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.plannerSchema, req.body);

    if (!(await rateLimiter.isAllowed(userId))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const cacheKey = CacheManager.getCacheKey('planner', userId, {
      bookId: input.bookId,
      dailyAvailableMinutes: input.dailyAvailableMinutes,
    });
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const [book, profile] = await Promise.all([
      aiDataService.getBookWithUserContext(input.bookId, userId),
      aiDataService.getUserReadingProfile(userId),
    ]);
    const fallback = buildPlannerFallback(book, profile, input.dailyAvailableMinutes);
    const raw = await this.generateJson(userId, 'planner', promptTemplates.smartPlanner(book.userEntry, book, profile, input.dailyAvailableMinutes), fallback, 'You are a reading coach. Return valid JSON only.');
    const result: PlannerResponse = formatPlanner(raw);

    await cacheService.set(cacheKey, result, CacheManager.TTLs.PLANNER);
    return res.json(result);
  }

  async searchSimilar(req: AuthenticatedRequest, res: Response) {
    const userId = requireUserId(req);
    const input = validateData(validators.searchSimilarSchema, req.body);

    if (!(await rateLimiter.isAllowed(userId))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const [book, profile] = await Promise.all([
      aiDataService.getBookWithUserContext(input.bookId, userId),
      aiDataService.getUserReadingProfile(userId),
    ]);
    const raw = await this.generateJson(userId, 'similar-books', promptTemplates.similarBooks(book, profile.favoriteGenres, input.limit), { similarBooks: [] }, 'You are a book recommendation engine. Return valid JSON only.');
    return res.json({ similarBooks: Array.isArray(raw) ? raw : (raw as any).similarBooks ?? [] });
  }
}

export const aiController = new AIController();
