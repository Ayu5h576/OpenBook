/**
 * Protected Route Component
 * Ensures only authenticated users can access certain routes
 */

import React from 'react';
import { ViewMode } from '../types';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onNavigate: (view: ViewMode) => void;
  fallbackView?: ViewMode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  onNavigate,
  fallbackView = 'landing',
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ink)] mx-auto mb-4" />
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to fallback view (usually landing or auth)
    React.useEffect(() => {
      onNavigate(fallbackView);
    }, [isAuthenticated, onNavigate, fallbackView]);

    return null;
  }

  return <>{children}</>;
};
