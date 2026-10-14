import { useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser } from '../../lib/auth';
import { PageLoadingSpinner } from '../LoadingSpinner';

export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { user, phase } = useAuth();
  // Captured ONCE, synchronously at mount, from the locally cached (server-confirmed) user. This is
  // deliberately a mount-time snapshot rather than the reactive `user`: a fresh login/register on
  // this very page sets `user` while still mounted here and must NOT be treated as "was already
  // signed in", or this guard's redirect races the page's own post-success navigate() (e.g.
  // RegisterPage -> /onboarding). The snapshot predates any in-page login, so the race cannot occur.
  const [hadSessionOnMount] = useState<boolean>(() => getCurrentUser() !== null);

  // Only hold the page while we are re-confirming a session we already know about. With no prior
  // session, the form is shown immediately - session verification never blocks a public auth page.
  if (hadSessionOnMount && phase === 'restoring') {
    return <PageLoadingSpinner message="Checking your session…" />;
  }

  if (hadSessionOnMount && user) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}