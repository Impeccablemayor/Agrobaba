import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}
