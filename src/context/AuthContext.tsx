/**
 * Authentication Context
 * Manages global authentication state and provides auth methods
 */

import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthService, User, Session } from '../services/api';

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

  // Initialize auth state from Supabase session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Check if there's an existing session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          // Fetch user profile from backend
          const response = await AuthService.getProfile();
          if (response.data?.user) {
            setUser(response.data.user);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        try {
          const response = await AuthService.getProfile();
          if (response.data?.user) {
            setUser(response.data.user);
            setIsAuthenticated(true);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
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

      if (response.data?.session) {
        // Sign in with Supabase to store the session
        const {
          error: signInError,
          data: { session },
        } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          throw signInError;
        }

        if (response.data?.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        }
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

      if (response.data?.user) {
        // Auto-login after registration
        await login(email, password);
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
      await supabase.auth.signOut();

      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    } finally {
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
