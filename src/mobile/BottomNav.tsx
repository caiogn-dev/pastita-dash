// src/mobile/BottomNav.tsx
import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  FireIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';

type TabKey = 'pedidos' | 'novo' | 'cozinha' | 'mais';

const TABS: { key: TabKey; label: string; Icon: typeof FireIcon }[] = [
  { key: 'pedidos', label: 'Pedidos', Icon: ClipboardDocumentListIcon },
  { key: 'novo', label: 'Novo', Icon: PlusCircleIcon },
  { key: 'cozinha', label: 'Cozinha', Icon: FireIcon },
  { key: 'mais', label: 'Mais', Icon: EllipsisHorizontalIcon },
];

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const active: TabKey =
    location.pathname === '/' ? ((params.get('tab') as TabKey) || 'pedidos') : 'mais';

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-bg-card border-t border-border-primary flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => navigate(`/?tab=${key}`)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${
              isActive ? 'text-brand-500' : 'text-fg-muted'
            }`}
          >
            <Icon className="h-6 w-6" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
