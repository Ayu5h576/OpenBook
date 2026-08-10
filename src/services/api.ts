/**
 * API Service Layer
 * Reusable HTTP client for backend API calls with automatic token handling
 */

// Express serves the Vite dev middleware, so the app is always same-origin.
const API_BASE_URL = '';

// The access token is deliberately kept in memory only. Persistence across
// reloads comes from the httpOnly refresh cookie, which JavaScript cannot read
// and an XSS payload therefore cannot steal.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

/**
 * Builds a human-readable message from an error body.
 * Validation failures come back as `{ error: 'Validation failed', details: [{ field, message }] }`
 * so surface the per-field messages instead of the generic headline.
 */
function formatApiError(body: any): string {
  const details = body?.details;

  if (Array.isArray(details) && details.length > 0) {
    const messages = details
      .map((d: any) => (d?.field ? `${d.field}: ${d.message}` : d?.message))
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  return body?.error || 'Request failed';
}

class ApiClient {
  private baseUrl: string;
  // Concurrent 401s must share one refresh attempt; otherwise each would rotate
  // the refresh token and invalidate the others' in-flight rotation.
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async refreshSession(): Promise<boolean> {
    this.refreshInFlight ??= (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          setAccessToken(null);
          return false;
        }

        const data = await response.json();
        const token = data?.session?.accessToken;

        if (!token) {
          setAccessToken(null);
          return false;
        }

        setAccessToken(token);
        return true;
      } catch {
        setAccessToken(null);
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  private async send(method: string, endpoint: string, body?: any): Promise<Response> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      let response = await this.send(method, endpoint, body);

      // The access token is short-lived. On expiry, rotate once and replay the
      // request so callers never see a spurious 401.
      if (response.status === 401 && endpoint !== '/api/auth/refresh') {
        if (await this.refreshSession()) {
          response = await this.send(method, endpoint, body);
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          error: formatApiError(data),
          code: data.code,
          details: data.details,
        };
      }

      // The backend returns the payload at the top level (e.g. `{ user, session }`),
      // so wrap it to match the `{ data }` shape callers expect.
      return { data: data as T };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body);
  }

  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }
}

const apiClient = new ApiClient(API_BASE_URL);

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  favoriteGenres: string[];
  readingGoal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: number;
  tokenType: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

// Auth Service
export const AuthService = {
  async register(
    email: string,
    username: string,
    password: string,
    confirmPassword: string
  ): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/api/auth/register', {
      email,
      username,
      password,
      confirmPassword,
    });
  },

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    });
  },

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/api/auth/logout', {});
  },

  /**
   * Exchanges the httpOnly refresh cookie for a new session.
   * Used on app boot to restore a session across page reloads.
   */
  async refresh(): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post('/api/auth/refresh', {});
  },

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get('/api/auth/me');
  },

  async updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put('/api/auth/profile', data);
  },

  async changePassword(
    newPassword: string,
    confirmPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/api/auth/change-password', {
      newPassword,
      confirmPassword,
    });
  },

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post('/api/auth/forgot-password', { email });
  },
};

// ─── Books ────────────────────────────────────────────────────────────────────

export interface GoogleBookResult {
  googleBooksId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverImage?: string;
  pageCount?: number;
  categories: string[];
  language: string;
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  averageRating?: number;
  ratingsCount: number;
}

export interface LocalBook {
  id: string;
  googleBooksId?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverImage?: string;
  pageCount?: number;
  categories: string[];
  language: string;
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  averageRating?: number;
  ratingsCount: number;
  createdAt: string;
}

export const BookApiService = {
  async search(
    q: string,
    type: 'title' | 'author' | 'isbn' | 'category' = 'title',
    page = 0,
    limit = 20
  ) {
    const params = new URLSearchParams({ q, type, page: String(page), limit: String(limit) });
    return apiClient.get<{ items: GoogleBookResult[]; totalItems: number }>(
      `/api/books/search?${params}`
    );
  },

  async getById(id: string) {
    return apiClient.get<{ book: LocalBook }>(`/api/books/${id}`);
  },

  async importBook(googleBooksId: string) {
    return apiClient.post<{ book: LocalBook }>('/api/books/import', { googleBooksId });
  },
};

// ─── Library ──────────────────────────────────────────────────────────────────

export type LibraryStatus = 'READING' | 'COMPLETED' | 'PAUSED' | 'DROPPED' | 'ARCHIVED' | 'OWNED';

export interface LibraryEntry {
  id: string;
  userId: string;
  bookId: string;
  book: LocalBook;
  status: LibraryStatus;
  currentPage: number;
  isFavorite: boolean;
  isPinned: boolean;
  startedAt?: string;
  finishedAt?: string;
  lastReadAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingSession {
  id: string;
  entryId: string;
  startPage: number;
  endPage: number;
  durationSecs: number;
  startedAt: string;
  endedAt: string;
}

export const LibraryApiService = {
  async getLibrary(status?: LibraryStatus) {
    const params = status ? `?status=${status}` : '';
    return apiClient.get<{ entries: LibraryEntry[] }>(`/api/library${params}`);
  },

  async getEntry(entryId: string) {
    return apiClient.get<{ entry: LibraryEntry & { readingSessions: ReadingSession[] } }>(
      `/api/library/${entryId}`
    );
  },

  async addToLibrary(bookId: string, status: LibraryStatus = 'OWNED', currentPage = 0) {
    return apiClient.post<{ entry: LibraryEntry }>('/api/library', { bookId, status, currentPage });
  },

  async updateEntry(entryId: string, data: Partial<Pick<LibraryEntry, 'status' | 'currentPage' | 'isFavorite' | 'isPinned' | 'startedAt' | 'finishedAt'>>) {
    return apiClient.put<{ entry: LibraryEntry }>(`/api/library/${entryId}`, data);
  },

  async removeFromLibrary(entryId: string) {
    return apiClient.delete(`/api/library/${entryId}`);
  },

  async logSession(entryId: string, session: { startPage: number; endPage: number; durationSecs: number; startedAt: string; endedAt: string }) {
    return apiClient.post<{ session: ReadingSession }>(`/api/library/${entryId}/sessions`, session);
  },
};

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export interface WishlistEntry {
  id: string;
  bookId: string;
  book: LocalBook;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
  createdAt: string;
}

export const WishlistApiService = {
  async getWishlist() {
    return apiClient.get<{ entries: WishlistEntry[] }>('/api/wishlist');
  },

  async addToWishlist(bookId: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM', notes?: string) {
    return apiClient.post<{ entry: WishlistEntry }>('/api/wishlist', { bookId, priority, notes });
  },

  async removeFromWishlist(entryId: string) {
    return apiClient.delete(`/api/wishlist/${entryId}`);
  },
};

// ─── Collections ──────────────────────────────────────────────────────────────

export interface CollectionBook {
  id: string;
  collectionId: string;
  bookId: string;
  book: LocalBook;
  sortOrder: number;
  addedAt: string;
}

export interface ApiCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverImage?: string;
  isPublic: boolean;
  books: CollectionBook[];
  createdAt: string;
  updatedAt: string;
}

export const CollectionApiService = {
  async getCollections() {
    return apiClient.get<{ collections: ApiCollection[] }>('/api/collections');
  },

  async getCollection(id: string) {
    return apiClient.get<{ collection: ApiCollection }>(`/api/collections/${id}`);
  },

  async createCollection(data: { name: string; description?: string; coverImage?: string; isPublic?: boolean }) {
    return apiClient.post<{ collection: ApiCollection }>('/api/collections', data);
  },

  async updateCollection(id: string, data: { name?: string; description?: string; coverImage?: string; isPublic?: boolean }) {
    return apiClient.put<{ collection: ApiCollection }>(`/api/collections/${id}`, data);
  },

  async deleteCollection(id: string) {
    return apiClient.delete(`/api/collections/${id}`);
  },

  async addBook(collectionId: string, bookId: string, sortOrder = 0) {
    return apiClient.post<{ entry: CollectionBook }>(`/api/collections/${collectionId}/books`, { bookId, sortOrder });
  },

  async removeBook(collectionId: string, bookId: string) {
    return apiClient.delete(`/api/collections/${collectionId}/books/${bookId}`);
  },
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface ApiReview {
  id: string;
  userId: string;
  bookId: string;
  rating: number;
  title?: string;
  body?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ReviewApiService = {
  async getBookReviews(bookId: string) {
    return apiClient.get<{ reviews: ApiReview[] }>(`/api/books/${bookId}/review`);
  },

  async getMyReview(bookId: string) {
    return apiClient.get<{ review: ApiReview | null }>(`/api/books/${bookId}/review/mine`);
  },

  async upsertReview(bookId: string, data: { rating: number; title?: string; body?: string; isPrivate?: boolean }) {
    return apiClient.put<{ review: ApiReview }>(`/api/books/${bookId}/review`, data);
  },

  async deleteReview(bookId: string) {
    return apiClient.delete(`/api/books/${bookId}/review`);
  },
};

// ─── Notes & Highlights ───────────────────────────────────────────────────────

export interface ApiNote {
  id: string;
  entryId: string;
  text: string;
  page?: number;
  chapter?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiHighlight {
  id: string;
  entryId: string;
  text: string;
  color: string;
  page?: number;
  chapter?: number;
  createdAt: string;
}

export const NoteApiService = {
  async getNotes(entryId: string) {
    return apiClient.get<{ notes: ApiNote[] }>(`/api/library/${entryId}/notes`);
  },

  async createNote(entryId: string, data: { text: string; page?: number; chapter?: number }) {
    return apiClient.post<{ note: ApiNote }>(`/api/library/${entryId}/notes`, data);
  },

  async updateNote(entryId: string, noteId: string, data: { text?: string; page?: number; chapter?: number }) {
    return apiClient.put<{ note: ApiNote }>(`/api/library/${entryId}/notes/${noteId}`, data);
  },

  async deleteNote(entryId: string, noteId: string) {
    return apiClient.delete(`/api/library/${entryId}/notes/${noteId}`);
  },

  async getHighlights(entryId: string) {
    return apiClient.get<{ highlights: ApiHighlight[] }>(`/api/library/${entryId}/highlights`);
  },

  async createHighlight(entryId: string, data: { text: string; color?: string; page?: number; chapter?: number }) {
    return apiClient.post<{ highlight: ApiHighlight }>(`/api/library/${entryId}/highlights`, data);
  },

  async deleteHighlight(entryId: string, highlightId: string) {
    return apiClient.delete(`/api/library/${entryId}/highlights/${highlightId}`);
  },
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsStats {
  overview: {
    booksInLibrary: number;
    booksCompleted: number;
    booksReading: number;
    totalPagesRead: number;
    totalHours: number;
    readingStreak: number;
    yearlyGoal: number | null;
    yearlyCompleted: number;
  };
  genreDistribution: { name: string; count: number }[];
  monthly: { month: string; pages: number; hours: number; books: number }[];
  calendar: { date: string; minutes: number }[];
  records: {
    longestBookId: string | null;
    shortestBookId: string | null;
    fastestReadBookId: string | null;
    fastestReadDays: number | null;
  };
}

export interface ReadingGoal {
  id: string;
  userId: string;
  year: number;
  targetBooks: number;
  targetPages?: number;
}

export const AnalyticsApiService = {
  async getStats() {
    return apiClient.get<{ stats: AnalyticsStats }>('/api/analytics');
  },

  async getGoal(year?: number) {
    const params = year ? `?year=${year}` : '';
    return apiClient.get<{ goal: ReadingGoal | null }>(`/api/analytics/goal${params}`);
  },

  async upsertGoal(data: { year: number; targetBooks: number; targetPages?: number }) {
    return apiClient.post<{ goal: ReadingGoal }>('/api/analytics/goal', data);
  },
};

// AI Reading Companion
export interface AIRecommendation {
  bookId?: string;
  title: string;
  authors: string[];
  coverImage?: string;
  reasoning: string;
  matchScore: number;
  categories: string[];
}

export interface ReadingCompassResponse {
  recommendations: AIRecommendation[];
  reasoning: string;
  generatedAt: string;
  fromCache?: boolean;
}

export interface AIBookDNA {
  bookId: string;
  title: string;
  themes: { name: string; weight: number }[];
  writingStyle: string;
  difficulty: number;
  emotionalTone: string;
  pacing: string;
  complexity: number;
  characterDepth: number;
  worldBuilding: number;
  philosophy: string;
  adventure?: number;
  romance?: number;
  mystery?: number;
}

export interface BookDNAResponse {
  dna: AIBookDNA;
  explanation: string;
  generatedAt: string;
  fromCache?: boolean;
}

export type SummaryFormat = 'quick' | 'detailed' | 'chapter' | 'theme' | 'character';

export interface SummaryResponse {
  format: SummaryFormat;
  summary: string;
  keyPoints?: string[];
  generatedAt: string;
  fromCache?: boolean;
}

export interface ChatResponse {
  response: string;
  conversationId?: string;
  generatedAt: string;
}

export interface PersonalInsights {
  favoriteGenres: { genre: string; percentage: number }[];
  readingSpeed: number;
  averageRating: number;
  totalBooksRead: number;
  totalPagesRead: number;
  currentReadingStreak: number;
  nextLikelyBook: { bookId: string; title: string; reasoning: string };
  moodPattern: string;
  readingTrend: 'increasing' | 'decreasing' | 'stable';
  mostHighlightedThemes: string[];
}

export interface InsightsResponse {
  insights: PersonalInsights;
  generatedAt: string;
  fromCache?: boolean;
}

export interface ReadingPlan {
  dailyPages: number;
  weeklyGoal: number;
  estimatedFinishDate: string;
  weeklySchedule: { day: string; targetPages: number; estimatedMinutes: number }[];
  adaptiveNotes: string;
}

export interface PlannerResponse {
  plan: ReadingPlan;
  generatedAt: string;
  fromCache?: boolean;
}

export const AIApiService = {
  getReadingCompass(data: { limit?: number; genres?: string[]; useCache?: boolean } = {}) {
    return apiClient.post<ReadingCompassResponse>('/api/ai/reading-compass', data);
  },

  getBookDNA(bookId: string, useCache = true) {
    return apiClient.post<BookDNAResponse>('/api/ai/book-dna', { bookId, useCache });
  },

  getSummary(bookId: string, format: SummaryFormat = 'quick', spoilerLevel: 'none' | 'mild' | 'full' = 'none') {
    return apiClient.post<SummaryResponse>('/api/ai/summaries', { bookId, format, spoilerLevel });
  },

  chat(data: { message: string; bookId?: string; context?: string; conversationId?: string }) {
    return apiClient.post<ChatResponse>('/api/ai/chat', data);
  },

  getInsights(useCache = true) {
    return apiClient.post<InsightsResponse>('/api/ai/insights', { useCache });
  },

  getPlanner(bookId: string, dailyAvailableMinutes = 60) {
    return apiClient.post<PlannerResponse>('/api/ai/planner', { bookId, dailyAvailableMinutes });
  },

  searchSimilar(bookId: string, limit = 5) {
    return apiClient.post<{ similarBooks: AIRecommendation[] }>('/api/ai/search-similar', { bookId, limit });
  },
};

// ─── Phase 5: Social & Community ────────────────────────────────────────────────

export interface UserSummary {
  id: string;
  username: string;
  avatar?: string | null;
  bio?: string | null;
}

export type ActivityType =
  | 'FINISHED_BOOK'
  | 'STARTED_BOOK'
  | 'ADDED_TO_LIBRARY'
  | 'WROTE_REVIEW'
  | 'FOLLOWED_USER'
  | 'CREATED_CLUB'
  | 'JOINED_CLUB'
  | 'POSTED_DISCUSSION'
  | 'UNLOCKED_ACHIEVEMENT';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: { id: string; username: string; avatar?: string | null };
  book?: { id: string; title: string; authors: string[]; coverImage?: string | null } | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface ActivityFeed {
  activities: ActivityItem[];
  nextCursor: string | null;
}

export const SocialApiService = {
  getFeed(scope: 'following' | 'me' | 'global' = 'following', limit = 20, cursor?: string) {
    const params = new URLSearchParams({ scope, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return apiClient.get<ActivityFeed>(`/api/social/feed?${params}`);
  },

  getStats(userId?: string) {
    const path = userId ? `/api/social/${userId}/stats` : '/api/social/stats';
    return apiClient.get<{ stats: { followers: number; following: number } }>(path);
  },

  getFollowers(userId?: string) {
    const path = userId ? `/api/social/${userId}/followers` : '/api/social/followers';
    return apiClient.get<{ users: UserSummary[] }>(path);
  },

  getFollowing(userId?: string) {
    const path = userId ? `/api/social/${userId}/following` : '/api/social/following';
    return apiClient.get<{ users: UserSummary[] }>(path);
  },

  follow(userId: string) {
    return apiClient.post<{ following: boolean }>(`/api/social/${userId}/follow`, {});
  },

  unfollow(userId: string) {
    return apiClient.delete<{ following: boolean }>(`/api/social/${userId}/follow`);
  },
};

// ─── Book Clubs ─────────────────────────────────────────────────────────────────

export type ClubRole = 'OWNER' | 'MODERATOR' | 'MEMBER';

export interface ClubBook {
  id: string;
  title: string;
  authors: string[];
  coverImage?: string | null;
}

export interface BookClub {
  id: string;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  isPrivate: boolean;
  owner: { id: string; username: string; avatar?: string | null };
  currentBook?: ClubBook | null;
  memberCount: number;
  discussionCount: number;
  viewerRole: ClubRole | null;
  isMember: boolean;
  createdAt: string;
}

export interface ClubMember {
  id: string;
  username: string;
  avatar?: string | null;
  role: ClubRole;
  joinedAt: string;
}

export interface BookClubDetail extends BookClub {
  members: ClubMember[];
}

export interface Discussion {
  id: string;
  clubId: string;
  title: string;
  body: string;
  author: { id: string; username: string; avatar?: string | null };
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscussionComment {
  id: string;
  body: string;
  author: { id: string; username: string; avatar?: string | null };
  createdAt: string;
}

export interface DiscussionDetail extends Discussion {
  comments: DiscussionComment[];
}

export const BookClubApiService = {
  getClubs() {
    return apiClient.get<{ clubs: BookClub[] }>('/api/clubs');
  },

  getClub(clubId: string) {
    return apiClient.get<{ club: BookClubDetail }>(`/api/clubs/${clubId}`);
  },

  createClub(data: { name: string; description?: string; coverImage?: string; currentBookId?: string; isPrivate?: boolean }) {
    return apiClient.post<{ club: BookClub }>('/api/clubs', data);
  },

  updateClub(clubId: string, data: { name?: string; description?: string; coverImage?: string; currentBookId?: string | null; isPrivate?: boolean }) {
    return apiClient.put<{ club: BookClub }>(`/api/clubs/${clubId}`, data);
  },

  deleteClub(clubId: string) {
    return apiClient.delete(`/api/clubs/${clubId}`);
  },

  joinClub(clubId: string) {
    return apiClient.post<{ club: BookClubDetail }>(`/api/clubs/${clubId}/join`, {});
  },

  leaveClub(clubId: string) {
    return apiClient.delete<{ left: boolean }>(`/api/clubs/${clubId}/leave`);
  },

  getDiscussions(clubId: string) {
    return apiClient.get<{ discussions: Discussion[] }>(`/api/clubs/${clubId}/discussions`);
  },

  createDiscussion(clubId: string, data: { title: string; body: string }) {
    return apiClient.post<{ discussion: Discussion }>(`/api/clubs/${clubId}/discussions`, data);
  },

  getDiscussion(clubId: string, discussionId: string) {
    return apiClient.get<{ discussion: DiscussionDetail }>(`/api/clubs/${clubId}/discussions/${discussionId}`);
  },

  addComment(clubId: string, discussionId: string, body: string) {
    return apiClient.post<{ comment: DiscussionComment }>(
      `/api/clubs/${clubId}/discussions/${discussionId}/comments`,
      { body }
    );
  },
};

// ─── Achievements ───────────────────────────────────────────────────────────────

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'reading' | 'consistency' | 'social' | 'collection';
  unit: string;
  threshold: number;
  progress: number;
  progressPercent: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  summary: { unlocked: number; total: number };
}

export const AchievementApiService = {
  getAchievements() {
    return apiClient.get<AchievementsResponse>('/api/achievements');
  },
};

export default apiClient;
