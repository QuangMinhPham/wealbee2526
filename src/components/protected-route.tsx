/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */

import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../lib/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Save the attempted URL to redirect back after login
      navigate('/login', { 
        replace: true,
        state: { from: location }
      });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (useEffect will handle redirect)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}