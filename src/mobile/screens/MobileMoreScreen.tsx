import React from 'react';
import { Link } from 'react-router-dom';
import { UserGroupIcon, ChatBubbleLeftRightIcon, CubeIcon, Cog6ToothIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRootStore } from '../../stores/rootStore';

export const MobileMoreScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const stores = useRootStore((s) => s.stores);
  const activeName = stores.find((s) => s.id === storeId)?.name;

  const items = [
    { key: 'customers', to: storeId ? `/stores/${storeId}/customers` : null, label: 'Clientes', Icon: UserGroupIcon },
    { key: 'inbox', to: '/inbox', label: 'Conversas', Icon: ChatBubbleLeftRightIcon },
    { key: 'products', to: storeId ? `/stores/${storeId}/products` : null, label: 'Produtos', Icon: CubeIcon },
    { key: 'settings', to: '/settings', label: 'Configurações', Icon: Cog6ToothIcon },
  ];

  return (
    <div>
      <header className="px-4 pb-2 pt-4">
        <h1 className="text-lg font-bold text-fg-primary">Mais</h1>
        {activeName && <p className="text-sm text-fg-muted">{activeName}</p>}
      </header>
      {!storeId && (
        <p className="px-4 pb-2 text-sm text-fg-muted">Selecione uma loja primeiro para acessar Clientes e Produtos.</p>
      )}
      <ul className="divide-y divide-border-primary border-y border-border-primary">
        {items.map(({ key, to, label, Icon }) => {
          const content = (
            <span className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-fg-muted" />
              <span className="flex-1">{label}</span>
              <ChevronRightIcon className="h-4 w-4 text-fg-muted" />
            </span>
          );
          if (!to) {
            return <li key={key} className="flex items-center px-4 py-4 text-fg-muted opacity-50">{content}</li>;
          }
          return (
            <li key={key}>
              <Link to={to} className="block px-4 py-4 text-fg-primary active:bg-bg-secondary">{content}</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
