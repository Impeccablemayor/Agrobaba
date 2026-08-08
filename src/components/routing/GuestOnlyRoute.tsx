import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoadingSpinner } from '../LoadingSpinner';

export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <PageLoadingSpinner message="Checking your session…" />;
  }

  if (user) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}