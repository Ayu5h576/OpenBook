/**
 * Authentication Context
 * Manages global authentication state and provides auth methods
 */

import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { AuthService, User, setAccessToken } from '../services/api';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore the session on boot. The access token lives in memory only, so a
  // page reload recovers it by exchanging the httpOnly refresh cookie.
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        const response = await AuthService.refresh();

        if (response.data?.session?.accessToken && response.data.user) {
          setAccessToken(response.data.session.accessToken);
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else if (response.error) {
          // No refresh token available (first load or session expired) - this is OK
          console.debug('No active session to restore');
        }
      } catch (err) {
        console.debug('Auth session restore failed (expected on first load):', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await AuthService.login(email, password);

      if (response.error) {
        setError(response.error);
        throw new Error(response.error);
      }

      if (response.data?.session?.accessToken && response.data.user) {
        setAccessToken(response.data.session.accessToken);
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await AuthService.register(email, username, password, password);

      if (response.error) {
        setError(response.error);
        throw new Error(response.error);
      }

      // Registration issues a full session, so no second sign-in is needed.
      if (response.data?.session?.accessToken && response.data.user) {
        setAccessToken(response.data.session.accessToken);
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setIsLoading(true);

      await AuthService.logout();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    } finally {
      // Drop local state regardless: if the revoke call failed, the client
      // should still end up signed out.
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await AuthService.updateProfile(data);
      if (response.error) {
        setError(response.error);
        throw new Error(response.error);
      }

      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
