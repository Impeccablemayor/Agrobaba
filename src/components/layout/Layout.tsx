import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { CategoryBar } from './CategoryBar';
import { Footer } from './Footer';
import { useAuth } from '../../contexts/AuthContext';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/portal-77x-admin'];

export function Layout() {
  const { pathname } = useLocation();
  const { phase, verifyAuth } = useAuth();
  const isAuthPage = AUTH_ROUTES.includes(pathname);
  
  // Show category strip on marketplace browsing surfaces
  const showCategoryBar = pathname === '/' || pathname === '/shop' || pathname.startsWith('/demands');

  if (isAuthPage) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#0d2917', width: '100%' }}>
        {phase === 'degraded' && (
          <div className="server-unavailable-banner" role="alert">
            <span>
              <i className="fa-solid fa-plug-circle-xmark"></i>
              Connection issue. Reconnecting to AgroBaba services…
            </span>
            <button type="button" onClick={() => void verifyAuth()}>
              <i className="fa-solid fa-rotate-right"></i> Retry
            </button>
          </div>
        )}
        <Outlet />
      </div>
    );
  }

  return (
    <div className="app-layout-wrapper">
      {phase === 'degraded' && (
        <div className="server-unavailable-banner" role="alert">
          <span>
            <i className="fa-solid fa-plug-circle-xmark"></i>
            Connection issue. Reconnecting to AgroBaba services…
          </span>
          <button type="button" onClick={() => void verifyAuth()}>
            <i className="fa-solid fa-rotate-right"></i> Retry
          </button>
        </div>
      )}

      <Navbar />
      {showCategoryBar && <CategoryBar />}

      <main className="main-content-area">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}