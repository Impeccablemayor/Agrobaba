import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Navbar } from './Navbar';
import { CategoryBar } from './CategoryBar';
import { Footer } from './Footer';
import { useAuth } from '../../contexts/AuthContext';

const AUTH_ROUTES = ['/login', '/register', '/portal-77x-admin'];

export function Layout() {
  const { pathname } = useLocation();
  const { status, verifyAuth } = useAuth();
  const isAuthPage = AUTH_ROUTES.includes(pathname);
  const isHome = pathname === '/';

  return (
    <>
      {status === 'serverUnavailable' && (
        <div className="server-unavailable-banner" role="alert">
          <span>
            <i className="fa-solid fa-plug-circle-xmark"></i>
            Unable to connect to the server. We can't verify your session right now.
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
      <Footer />
    </>
  );
}