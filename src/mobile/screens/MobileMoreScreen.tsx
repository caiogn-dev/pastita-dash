import React from 'react';
import { Link } from 'react-router-dom';
import { useRootStore } from '../../stores/rootStore';

export const MobileMoreScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const links = [
    { to: storeId ? `/stores/${storeId}/customers` : '/stores', label: 'Clientes' },
    { to: '/inbox', label: 'Conversas' },
    { to: storeId ? `/stores/${storeId}/products` : '/stores', label: 'Produtos' },
    { to: '/settings', label: 'Configurações' },
  ];
  return (
    <ul className="divide-y divide-border-primary">
      {links.map((l) => (
        <li key={l.label}>
          <Link to={l.to} className="block px-4 py-4 text-fg-primary">{l.label}</Link>
        </li>
      ))}
    </ul>
  );
};
