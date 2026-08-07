/**
 * AI Feature Type Definitions
 * Centralized types for all AI-powered features
 */

// ─── Recommendation System ────────────────────────────────────────────────────
export interface Recommendation {
  bookId: string;
  title: string;
  authors: string[];
  coverImage?: string;
  reasoning: string; // WHY this book is recommended
  matchScore: number; // 0-100
  categories: string[];
}

export interface ReadingCompassResponse {
  recommendations: Recommendation[];
  reasoning: string; // Overall reasoning for the recommendations
  generatedAt: string; // ISO timestamp
}

// ─── Book Analysis System ─────────────────────────────────────────────────────
export interface BookDNA {
  bookId: string;
  title: string;
  themes: Array<{ name: string; weight: number }>;
  writingStyle: string; // e.g., "Literary", "Fast-paced", "Descriptive"
  difficulty: number; // 1-5
  emotionalTone: string; // e.g., "Dark", "Uplifting", "Mysterious"
  pacing: string; // "Slow", "Steady", "Fast"
  complexity: number; // 1-5 (plot, structure complexity)
  characterDepth: number; // 1-5
  worldBuilding: number; // 1-5
  philosophy: string; // Underlying philosophy/worldview
  adventure?: number; // 1-5
  romance?: number; // 1-5
  mystery?: number; // 1-5
}

export interface BookDNAResponse {
  dna: BookDNA;
  explanation: string;
  generatedAt: string;
}

// ─── Summary System ──────────────────────────────────────────────────────────
export type SummaryFormat = 'quick' | 'detailed' | 'chapter' | 'theme' | 'character';

export interface SummaryRequest {
  bookId: string;
  format: SummaryFormat;
  spoilerLevel?: 'none' | 'mild' | 'full'; // default: 'none'
}

export interface SummaryResponse {
  format: SummaryFormat;
  summary: string;
  keyPoints?: string[];
  generatedAt: string;
}

// ─── Chat System ─────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  bookId?: string; // If chat is about a specific book
}

export interface ChatRequest {
  message: string;
  bookId?: string; // If asking about a specific book
  context?: string; // Additional context
  conversationId?: string;
}

export interface ChatResponse {
  response: string;
  conversationId?: string;
  relatedBooks?: Array<{ bookId: string; title: string; relevance: string }>;
  generatedAt: string;
}

// ─── Insights System ─────────────────────────────────────────────────────────
export interface PersonalInsights {
  favoriteGenres: Array<{ genre: string; percentage: number }>;
  readingSpeed: number; // pages per hour
  averageRating: number; // 0-5
  totalBooksRead: number;
  totalPagesRead: number;
  currentReadingStreak: number; // consecutive days
  nextLikelyBook: {
    bookId: string;
    title: string;
    reasoning: string;
  };
  moodPattern: string; // When they read best
  readingTrend: 'increasing' | 'decreasing' | 'stable';
  mostHighlightedThemes: string[];
}

export interface InsightsResponse {
  insights: PersonalInsights;
  generatedAt: string;
}

// ─── Reading Planner ─────────────────────────────────────────────────────────
export interface ScheduleDay {
  day: string; // Day name
  targetPages: number;
  estimatedMinutes: number;
}

export interface ReadingPlan {
  dailyPages: number;
  weeklySchedule: ScheduleDay[];
  estimatedFinishDate: string; // ISO date
  weeklyGoal: number;
  adaptiveNotes: string;
}

export interface PlannerResponse {
  plan: ReadingPlan;
  generatedAt: string;
}

// ─── Similar Books ───────────────────────────────────────────────────────────
export interface SimilarBook {
  bookId: string;
  title: string;
  authors: string[];
  similarity: number; // 0-100
  reason: string;
}

// ─── AI Request/Response Metadata ────────────────────────────────────────────
export interface AIServiceOptions {
  userId: string;
  useCache?: boolean;
  cacheKey?: string;
  timeout?: number; // ms
}

export interface AIUsageLog {
  userId: string;
  feature: string; // 'reading-compass', 'book-dna', etc.
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: string;
  success: boolean;
  error?: string;
}
