// src/mobile/MobileShell.tsx
import React from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { MobileTopBar } from './MobileTopBar';
import { MobileOrdersScreen } from './screens/MobileOrdersScreen';
import { MobileKdsScreen } from './screens/MobileKdsScreen';
import { MobileNewOrderScreen } from './screens/MobileNewOrderScreen';
import { MobileMoreScreen } from './screens/MobileMoreScreen';

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
    <div className="flex min-h-screen flex-col bg-bg-secondary text-fg-primary">
      <MobileTopBar />
      <main className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {isHome ? renderTab(tab) : <Outlet />}
      </main>
      <BottomNav />
    </div>
  );
};

export default MobileShell;
