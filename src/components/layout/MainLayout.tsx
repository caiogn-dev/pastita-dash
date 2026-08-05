import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { TrialBanner } from './TrialBanner';
import { useIsMobileViewport } from '../../mobile/useIsMobileViewport';
import { MobileShell } from '../../mobile/MobileShell';
import { useAuthStore } from '../../stores/authStore';

export const MainLayout: React.FC = () => {
  const location = useLocation();

  // Só o BOARD de pedidos é full-bleed (tem chrome próprio). Sub-rotas como
  // /orders/new e /orders/:id ganham o shell normal (navbar + banner) — antes a
  // regex engolia tudo e a OrderNewPage renderizava órfã, sem navegação.
  const isDedicatedOrderRoute = /^\/stores\/[^/]+\/orders\/?$/.test(location.pathname);
  const isFullscreenRoute = /^\/(whatsapp\/(inbox|chat)|conversations|inbox)/.test(location.pathname);

  const isMobile = useIsMobileViewport();
  const isAuthed = useAuthStore((s) => s.isAuthenticated);

  // Phone-sized + authenticated: render the mobile shell instead of the desktop
  // chrome. Fullscreen routes (inbox/chat) keep their own full-bleed layout.
  if (isMobile && isAuthed && !isFullscreenRoute) {
    return <MobileShell />;
  }

  if (isDedicatedOrderRoute) {
    return (
      <div className="min-h-screen bg-canvas text-fg-token">
        <Outlet />
      </div>
    );
  }

  if (isFullscreenRoute) {
    return (
      <div className="min-h-screen bg-bg-secondary text-fg-primary flex flex-col relative">
        <Navbar />
        <TrialBanner />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary text-fg-primary flex flex-col relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at top right, rgba(201, 162, 75, 0.08), transparent 55%)' }}
      />
      <Navbar />
      <TrialBanner />
      {/* SEM z-index aqui. `main` é flex item, e pela spec do Flexbox um z-index
          num flex item cria stacking context mesmo com position static. Com
          z-10, a navbar irmã (sticky z-40, opaca) pintava acima de TODA a
          subárvore da página — nenhum drawer adiantava declarar z-50 ou z-[60],
          e os 64px do topo (título e botão X) ficavam inalcançáveis em 11
          superfícies. O gradiente decorativo acima já pinta antes por ordem de
          documento e é pointer-events-none, então a camada era desnecessária. */}
      <main className="flex-1 overflow-auto bg-transparent px-7 py-5 max-xl:px-5 max-md:px-3 max-md:py-3">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
