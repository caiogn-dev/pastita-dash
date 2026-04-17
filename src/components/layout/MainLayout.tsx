/**
 * MainLayout - Layout principal sem Chakra UI
 */
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  const isDedicatedOrderRoute = /^\/stores\/[^/]+\/orders(?:\/.*)?$/.test(location.pathname);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isDedicatedOrderRoute) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] text-fg-primary dark:bg-[#050505]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-secondary text-fg-primary relative">
      {/* Decorative gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at top right, rgba(249, 115, 22, 0.08), transparent 55%)' }}
      />

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Mobile */}
      <div
        className="fixed left-0 top-0 bottom-0 w-[280px] z-40 lg:hidden transition-transform duration-300 ease-in-out"
        style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Sidebar Desktop */}
      <div className="w-[280px] flex-shrink-0 hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden z-10">
        <Header
          title="Painel Operacional"
          subtitle="CRM Pastita"
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto bg-transparent px-3 py-3 md:px-5 md:py-5 xl:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
