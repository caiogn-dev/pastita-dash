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
  const location = useLocation();
  const title = TITLES.find((t) => t.match.test(location.pathname))?.title ?? '';

  // Voltar respeita o histórico real (ex.: veio de um detalhe ou de outra aba).
  // Só cai no fallback '/?tab=mais' quando esta é a primeira entrada da sessão
  // (deep-link direto) — location.key === 'default' no react-router v6.
  const handleBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/?tab=mais');
  };

  return (
    <div className="sticky top-0 z-30 flex items-center gap-1 border-b border-border-primary bg-bg-card px-2 py-2">
      <button type="button" aria-label="Voltar" onClick={handleBack}
        className="flex items-center gap-1 p-2 text-fg-primary">
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <span className="text-base font-semibold text-fg-primary">{title}</span>
    </div>
  );
};
