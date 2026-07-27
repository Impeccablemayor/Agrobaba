import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Navbar } from './Navbar';
import { CategoryBar } from './CategoryBar';
import { Footer } from './Footer';

const AUTH_ROUTES = ['/login', '/register', '/portal-77x-admin'];

export function Layout() {
  const { pathname } = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  return (
    <>
      {!isAuthPage && <TopBar />}
      {!isAuthPage && <Navbar />}
      {!isAuthPage && <CategoryBar />}
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
