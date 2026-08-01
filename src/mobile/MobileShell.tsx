// src/mobile/MobileShell.tsx
import React from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { MobileTopBar } from './MobileTopBar';
import { MobileOrdersScreen } from './screens/MobileOrdersScreen';
import { MobileKdsScreen } from './screens/MobileKdsScreen';
import { MobileNewOrderScreen } from './screens/MobileNewOrderScreen';
import { MobileMoreScreen } from './screens/MobileMoreScreen';
import { MobileOrdersProvider } from './MobileOrdersContext';
import { MobilePageHeader } from './MobilePageHeader';
import { InstallBanner } from './InstallBanner';

type TabKey = 'pedidos' | 'novo' | 'cozinha' | 'mais';

function renderTab(tab: TabKey) {
  switch (tab) {
    case 'pedidos': return <MobileOrdersScreen />;
    case 'novo': return <MobileNewOrderScreen />;
    case 'cozinha': return <MobileKdsScreen />;
    case 'mais': return <MobileMoreScreen />;
    default: return <MobileOrdersScreen />;
  }
}

export const MobileShell: React.FC = () => {
  const location = useLocation();
  const [params] = useSearchParams();
  const isHome = location.pathname === '/';
  const tab = (params.get('tab') as TabKey) || 'pedidos';

  return (
    <MobileOrdersProvider>
      <div className="flex min-h-screen flex-col bg-bg-secondary text-fg-primary">
        <MobileTopBar />
        <main className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <InstallBanner />
          {isHome ? (
            renderTab(tab)
          ) : (
            <>
              <MobilePageHeader />
              {/* Contenção das páginas desktop no shell mobile: sem isso elas
                  renderizam cruas (sem padding, estourando a largura — o
                  "vaza páginas desktop" da auditoria). min-w-0 + overflow-x
                  clipado no contêiner: tabelas/grades largas rolam DENTRO dos
                  próprios wrappers overflow-x-auto, nunca a página inteira. */}
              <div className="mobile-desktop-page min-w-0 max-w-full overflow-x-hidden px-3 py-3">
                <Outlet />
              </div>
            </>
          )}
        </main>
        <BottomNav />
      </div>
    </MobileOrdersProvider>
  );
};

export default MobileShell;
