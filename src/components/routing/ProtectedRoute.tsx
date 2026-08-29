import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BackendUnavailable } from '../BackendUnavailable';
import { PageLoadingSpinner } from '../LoadingSpinner';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, status, verifyAuth } = useAuth();
  const location = useLocation();

  // Backend can't confirm the session - never let the protected page render as if it were live.
  if (status === 'serverUnavailable') {
    return <BackendUnavailable onRetry={() => void verifyAuth()} />;
  }

  if (user) {
    return <>{children}</>;
  }

  if (status === 'initializing') {
    return <PageLoadingSpinner message="Checking your session…" />;
  }

  return <Navigate to="/login" state={{ from: location }} replace />;
}