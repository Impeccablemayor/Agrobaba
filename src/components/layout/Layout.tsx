import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Navbar } from './Navbar';
import { CategoryBar } from './CategoryBar';
import { Footer } from './Footer';

export function Layout() {
  return (
    <>
      <TopBar />
      <Navbar />
      <CategoryBar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
