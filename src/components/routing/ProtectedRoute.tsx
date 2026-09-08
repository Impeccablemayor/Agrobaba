import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BackendUnavailable } from '../BackendUnavailable';
import { PageLoadingSpinner } from '../LoadingSpinner';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, phase, identity, verifyAuth } = useAuth();
  const location = useLocation();

  // Restoring: we cannot yet say who the user is - show a spinner, never a "login" prompt.
  if (phase === 'restoring' || identity === 'unknown') {
    return <PageLoadingSpinner message="Checking your session…" />;
  }

  // Re-authentication pending: identity is still known, so render the page beneath the global
  // re-auth overlay (Phase C) rather than bouncing the user to a bare login page.
  if (user) {
    return <>{children}</>;
  }

  // Degraded but NO identity: cannot show a protected page. The global banner plus the silent
  // renewal loop recover automatically; this guard just holds the protected view until then.
  if (phase === 'degraded') {
    return <BackendUnavailable onRetry={() => void verifyAuth()} />;
  }

  // Genuinely not signed in.
  return <Navigate to="/login" state={{ from: location }} replace />;
}