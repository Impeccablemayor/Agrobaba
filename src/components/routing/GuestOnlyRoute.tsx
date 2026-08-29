import { useRef, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoadingSpinner } from '../LoadingSpinner';

export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  // Captured once, the first time loading resolves - deliberately NOT reactive to every `user`
  // change. Otherwise a fresh login/register on this very page (which sets `user` while still
  // mounted here) races this guard's redirect against the page's own post-success navigate(),
  // and this guard can win, sending a just-registered user to /account even when the page meant
  // to send them elsewhere (e.g. RegisterPage -> /onboarding). This only needs to catch someone
  // who was ALREADY signed in before landing on /login or /register.
  const wasAlreadyAuthenticated = useRef<boolean | null>(null);

  if (status === 'initializing') {
    return <PageLoadingSpinner message="Checking your session…" />;
  }

  if (wasAlreadyAuthenticated.current === null) {
    wasAlreadyAuthenticated.current = !!user;
  }

  if (wasAlreadyAuthenticated.current) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}