import 'express-async-errors';
import express, { type Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, validateEnv } from './src/server/config/env';
import authRoutes from './src/server/routes/authRoutes';
import bookRoutes from './src/server/routes/bookRoutes';
import libraryRoutes from './src/server/routes/libraryRoutes';
import collectionRoutes from './src/server/routes/collectionRoutes';
import reviewRoutes from './src/server/routes/reviewRoutes';
import wishlistRoutes from './src/server/routes/wishlistRoutes';
import analyticsRoutes from './src/server/routes/analyticsRoutes';
import aiRoutes from './src/server/routes/aiRoutes';
import socialRoutes from './src/server/routes/socialRoutes';
import bookClubRoutes from './src/server/routes/bookClubRoutes';
import achievementRoutes from './src/server/routes/achievementRoutes';
import { errorHandlerMiddleware } from './src/server/middlewares/errorHandler';

// ---------------------------------------------------------------------------
// buildApp — creates and configures the Express application.
// Exported so integration tests can import it without starting Vite or listen().
// ---------------------------------------------------------------------------
export async function buildApp(): Promise<Express> {
  validateEnv();

  const app = express();

  // Core middleware
  app.use(
    cors({
      origin: env.app.appUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Security headers
  app.use(helmet({
    // CSP is handled by Vite in dev; relax in production as needed
    contentSecurityPolicy: env.app.nodeEnv === 'production',
    crossOriginEmbedderPolicy: false,
  }));

  // Global rate limit: 200 requests per 15 minutes per IP
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: () => env.app.nodeEnv === 'test',
  }));

  // Tighter limit on auth endpoints: 15 requests per 15 minutes per IP
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
    skip: () => env.app.nodeEnv === 'test',
  });

  // Initialize Gemini Client
  const getGeminiClient = () => {
    const apiKey = env.gemini.apiKey;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'openbook-app' } },
    });
  };

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'OpenBook', timestamp: new Date().toISOString() });
  });

  // Auth routes (with tighter rate limiting)
  app.use('/api/auth', authRateLimit, authRoutes);

  // Phase 3: Books, Library, Collections, Reviews, Wishlist, Analytics
  app.use('/api/books', bookRoutes);
  app.use('/api/library', libraryRoutes);
  app.use('/api/collections', collectionRoutes);
  app.use('/api/books/:bookId/review', reviewRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Phase 4: AI Reading Companion
  app.use('/api/ai', aiRoutes);

  // Phase 5: Social & Community
  app.use('/api/social', socialRoutes);
  app.use('/api/clubs', bookClubRoutes);
  app.use('/api/achievements', achievementRoutes);

  // Legacy AI endpoints (deprecated - kept for backward compatibility)
  app.post('/api/ai/analyze-legacy', async (req, res) => {
    try {
      const { prompt, context, type } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          response: `[Offline Mode] Here is an insightful breakdown of "${type || 'your request'}":\n\n1. Core Theme: Explores human resilience and identity through rich atmospheric storytelling.\n2. Key Insight: Literature reflects our deepest unexamined desires and moral choices.\n3. Reading Advice: Read slowly with attention to pacing and character dialogue.`,
          isFallback: true,
        });
      }

      let systemInstruction = "You are OpenBook's literary AI companion, a deeply knowledgeable, cultured, and articulate literary editor and reading mentor. Respond in elegant, clear, warm tone with well-structured markdown.";

      if (type === 'relationship_graph') {
        systemInstruction = "Analyze character relationships in the provided book context. Return a JSON object formatted as: { \"nodes\": [{\"id\": \"Name\", \"role\": \"Description\"}], \"links\": [{\"source\": \"Name\", \"target\": \"Name\", \"label\": \"Relationship\"}] }";
      } else if (type === 'summary') {
        systemInstruction = "Provide a high-level, elegant 3-part summary: 1. Executive Essence, 2. Key Takeaways (3 bullet points), 3. Ideal Reader Profile.";
      } else if (type === 'explain') {
        systemInstruction = "Explain this paragraph in clear, engaging terms. Highlight the literary devices, historical context, or psychological nuance.";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${context ? `Book Context:\n${context}\n\n` : ''}User Query: ${prompt}`,
        config: { systemInstruction },
      });

      res.json({ response: response.text });
    } catch (err: any) {
      console.error('Gemini Error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate AI response' });
    }
  });

  // API: Reading Compass (Mood-based recommendation)
  app.post('/api/ai/compass', async (req, res) => {
    try {
      const { mood } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          recommendations: [
            {
              title: 'The Shadow of the Wind',
              author: 'Carlos Ruiz Zafón',
              genre: 'Gothic Mystery',
              matchReason: 'Matches your craving for atmospheric, labyrinthine bookish mystery.',
              rating: 4.8,
            },
            {
              title: 'Norwegian Wood',
              author: 'Haruki Murakami',
              genre: 'Literary Fiction',
              matchReason: 'Resonates with nostalgic, introspective quiet reflection.',
              rating: 4.7,
            },
          ],
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Suggest 3 books based on this emotional/mood description: "${mood}". Return a JSON array of objects with keys: "title", "author", "genre", "matchReason", "rating".`,
        config: { responseMimeType: 'application/json' },
      });

      try {
        const parsed = JSON.parse(response.text || '[]');
        res.json({ recommendations: parsed });
      } catch {
        res.json({ rawText: response.text });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Natural Language Search
  app.post('/api/ai/search', async (req, res) => {
    try {
      const { query } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          suggestedGenres: ['Literary Fiction', 'Philosophy', 'Psychology'],
          searchTokens: [query],
          curatedNote: `Searching personal library for "${query}"`,
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `User searched for: "${query}". Analyze search intent and return a JSON object with: "intentKeywords": ["keyword1", "keyword2"], "recommendedGenres": ["Genre1"], "editorialInsight": "1 sentence describing what kind of books match this vibe".`,
        config: { responseMimeType: 'application/json' },
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Gemini Personalized Library Recommendations
  app.post('/api/ai/recommendations', async (req, res) => {
    try {
      const { userBooks, preferenceFocus } = req.body;
      const ai = getGeminiClient();

      const bookSummaries = (userBooks || [])
        .map(
          (b: any) =>
            `- "${b.title}" by ${b.author} (Genres: ${b.genres?.join(', ')}, Status: ${b.status}, Favorite: ${b.favorite ? 'Yes' : 'No'}, Rating: ${b.rating || 'N/A'})`
        )
        .join('\n');

      if (!ai) {
        return res.json({
          analysisSummary: 'Your library reflects a deep taste for atmospheric, introspective fiction.',
          recommendations: [
            {
              id: 'rec-1',
              title: 'The Memory Police',
              author: 'Yoko Ogawa',
              genre: 'Dystopian Speculative',
              matchPercentage: 98,
              basedOnBook: 'Klara and the Sun',
              personalizedSummary:
                'An exquisite, quiet exploration of memory and loss that mirrors the delicate melancholic prose of your favorite speculative works.',
              cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
              rating: 4.8,
              pages: 274,
            },
          ],
        });
      }

      const prompt = `Analyze this user's personal reading library:\n${bookSummaries}\n${preferenceFocus ? `Preference Focus: ${preferenceFocus}\n` : ''}

Generate 3-4 highly tailored book recommendations. Return a JSON object with:
"analysisSummary": "1-2 sentence overall analysis of user's literary taste",
"recommendations": [
  {
    "id": "rec-1",
    "title": "Book Title",
    "author": "Author Name",
    "genre": "Primary Genre",
    "matchPercentage": 95,
    "basedOnBook": "Title of book from user's library that inspired this recommendation",
    "personalizedSummary": "2-3 sentences explaining why this book is specifically recommended for this user based on their specific reading history and themes",
    "cover": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
    "rating": 4.8,
    "pages": 300
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction:
            "You are OpenBook's chief literary curator. Analyze reading patterns and recommend deeply resonant books with thoughtful personalized summaries.",
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err: any) {
      console.error('Gemini Recommendations Error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate recommendations' });
    }
  });

  // Error handler — must be registered last inside buildApp so tests can use it
  app.use(errorHandlerMiddleware);

  return app;
}

// ---------------------------------------------------------------------------
// startServer — adds Vite / static file serving and binds to a port.
// This is the entry point when the file is run directly (npm run dev / start).
// ---------------------------------------------------------------------------
async function startServer() {
  const app = await buildApp();

  if (env.app.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(env.app.port, '0.0.0.0', () => {
    console.log(`[OpenBook] Server running at http://0.0.0.0:${env.app.port}`);
    console.log(`[OpenBook] Environment: ${env.app.nodeEnv}`);
  });
}

// Only start the server when this file is the direct entry point, not when
// imported by tests (e.g. `import { buildApp } from './server'`).
const isEntryPoint = process.argv[1] && (
  process.argv[1].endsWith('server.ts') ||
  process.argv[1].endsWith('server.cjs') ||
  process.argv[1].includes('tsx')
);

if (isEntryPoint) {
  startServer();
}
