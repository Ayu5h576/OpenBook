/**
 * API Service Layer
 * Reusable HTTP client for backend API calls with automatic token handling
 */

import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || 'Request failed',
          code: data.code,
          details: data.details,
        };
      }

      return data;
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

  async refresh(refreshToken: string): Promise<ApiResponse<{ session: Session }>> {
    return apiClient.post('/api/auth/refresh', { refreshToken });
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
