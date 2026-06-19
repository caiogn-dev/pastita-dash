// src/mobile/MobilePageHeader.tsx
import React from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';

const TITLES: { match: RegExp; title: string }[] = [
  { match: /\/customers/, title: 'Clientes' },
  { match: /\/products/, title: 'Produtos' },
  { match: /\/settings/, title: 'Configurações' },
  { match: /\/stores$/, title: 'Lojas' },
];

export const MobilePageHeader: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = TITLES.find((t) => t.match.test(pathname))?.title ?? '';

  return (
    <div className="sticky top-0 z-30 flex items-center gap-1 border-b border-border-primary bg-bg-card px-2 py-2">
      <button type="button" aria-label="Voltar" onClick={() => navigate('/?tab=mais')}
        className="flex items-center gap-1 p-2 text-fg-primary">
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <span className="text-base font-semibold text-fg-primary">{title}</span>
    </div>
  );
};
