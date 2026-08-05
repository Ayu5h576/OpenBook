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

export default apiClient;
