import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isTokenValid, useSession } from '../lib/session';

export default function PrivateRoute() {
  const { token, version } = useSession();
  const location = useLocation();

  if (!isTokenValid(token)) {
    const from = location.pathname + location.search + location.hash;
    return <Navigate to="/login" state={{ from }} replace />;
  }

  // Reinicia também o estado local das páginas quando a conta muda em outra aba.
  return <Outlet key={version} />;
}
