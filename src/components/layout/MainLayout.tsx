import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';

export const MainLayout: React.FC = () => {
  const location = useLocation();

  const isDedicatedOrderRoute = /^\/stores\/[^/]+\/orders(?:\/.*)?$/.test(location.pathname);

  if (isDedicatedOrderRoute) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] text-fg-primary dark:bg-[#050505]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary text-fg-primary flex flex-col relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at top right, rgba(249, 115, 22, 0.08), transparent 55%)' }}
      />
      <Navbar />
      <main className="flex-1 overflow-auto bg-transparent px-3 py-3 md:px-5 md:py-5 xl:px-7 z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
