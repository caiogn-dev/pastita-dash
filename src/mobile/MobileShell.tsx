// src/mobile/MobileShell.tsx
import React from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { MobileOrdersScreen } from './screens/MobileOrdersScreen';

type TabKey = 'pedidos' | 'novo' | 'cozinha' | 'mais';

// Placeholder screens — replaced by real screens in later tasks.
const Placeholder: React.FC<{ tab: TabKey }> = ({ tab }) => (
  <div data-testid={`mobile-screen-${tab}`} className="p-4 text-fg-primary">
    {tab}
  </div>
);

function renderTab(tab: TabKey) {
  switch (tab) {
    case 'pedidos': return <MobileOrdersScreen />;
    default: return <Placeholder tab={tab} />;
  }
}

export const MobileShell: React.FC = () => {
  const location = useLocation();
  const [params] = useSearchParams();
  const isHome = location.pathname === '/';
  const tab = (params.get('tab') as TabKey) || 'pedidos';

  return (
    <div className="min-h-screen bg-bg-secondary text-fg-primary flex flex-col">
      <main className="flex-1 overflow-auto pb-20">
        {isHome ? renderTab(tab) : <Outlet />}
      </main>
      <BottomNav />
    </div>
  );
};

export default MobileShell;
