/**
 * Nome da loja ativa no topo, nas telas que não têm a loja no endereço
 * (Relatórios, Marketing, Atendimento). Sob /stores/<slug> a loja já está na
 * URL e no seletor; com uma loja só não há o que confundir.
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';

import { useRootStore } from '../../stores/rootStore';

export const LojaAtivaNoTopo: React.FC<{ className?: string }> = ({ className }) => {
  const { pathname } = useLocation();
  const stores = useRootStore((s) => s.stores);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const storeName = stores.find((s) => s.id === selectedStoreId)?.name;
  if (stores.length < 2 || !storeName || /^\/stores\/[^/]+/.test(pathname)) return null;
  return (
    <span className={className ?? 'flex items-center gap-1.5 text-body font-semibold text-chrome-fg'}>
      <BuildingStorefrontIcon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="max-w-[200px] truncate">{storeName}</span>
    </span>
  );
};

export default LojaAtivaNoTopo;
