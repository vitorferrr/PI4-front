import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../lib/session';
import type { Role } from '../types';

export default function RequireRole({ roles }: { roles: Role[] }) {
  const role = useSession((state) => state.claims?.role);

  if (!roles.includes(role as Role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
