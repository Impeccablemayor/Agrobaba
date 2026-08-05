import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Role } from '../../types';

/** Like ProtectedRoute, but also requires a specific role. The backend independently enforces
 *  the real authorization on every admin endpoint regardless of this check - this only stops a
 *  non-admin user from briefly seeing the admin page's layout before its data calls fail. */
export function RoleProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user.role !== role) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}
