import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Navbar } from './Navbar';
import { CategoryBar } from './CategoryBar';
import { Footer } from './Footer';
import { ReauthModal } from '../ReauthModal';
import { useAuth } from '../../contexts/AuthContext';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/portal-77x-admin'];

export function Layout() {
  const { pathname } = useLocation();
  const { phase, verifyAuth } = useAuth();
  const isAuthPage = AUTH_ROUTES.includes(pathname);
  const isHome = pathname === '/';

  return (
    <>
      {phase === 'degraded' && (
        <div className="server-unavailable-banner" role="alert">
          <span>
            <i className="fa-solid fa-plug-circle-xmark"></i>
            Connection issue. We're trying to reconnect…
          </span>
          <button type="button" onClick={() => void verifyAuth()}>
            <i className="fa-solid fa-rotate-right"></i> Retry
          </button>
        </div>
      )}
      {!isAuthPage && <TopBar />}
      {!isAuthPage && <Navbar compact={isHome} />}
      {!isAuthPage && <CategoryBar compact={isHome} />}
      <main>
        <Outlet />
      </main>
      {!isAuthPage && <Footer />}
      <ReauthModal />
    </>
  );
}