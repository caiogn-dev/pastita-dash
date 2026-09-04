import React, { Fragment, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon, BuildingStorefrontIcon,
  LinkIcon, Cog6ToothIcon, SparklesIcon, CreditCardIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useStore } from '../../hooks/useStore';

export interface AccountLink {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  sectionHeader?: string;
}

export const ACCOUNT_LINKS: AccountLink[] = [
  { name: 'Todas as Lojas',  href: '/stores',      icon: BuildingStorefrontIcon },
  // 'Contas WhatsApp' (/accounts) saiu: era a MESMA lista de 'Conexões', e as
  // duas chamavam `whatsappService.getAccounts`. Dois caminhos para a mesma
  // tela ensinam o operador duas vezes e nenhuma delas por inteiro.
  { name: 'Conexões',        href: '/connections', icon: LinkIcon, sectionHeader: 'Integrações' },
  { name: 'Preferências',    href: '/settings',    icon: Cog6ToothIcon, sectionHeader: 'Conta' },
  { name: 'Plano',           href: '/plano',       icon: SparklesIcon },
  { name: 'Assinatura',      href: '/assinatura',  icon: CreditCardIcon },
];

export const AccountMenu: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { store } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null!);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    update();
    const onDoc = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (document.getElementById('account-menu-portal')?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    document.addEventListener('mousedown', onDoc);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open, close]);

  const initial = user?.first_name?.[0] || user?.username?.[0] || 'U';

  return (
    <div className="flex items-center border-l border-chrome-border pl-2">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu da conta"
        className="flex items-center gap-1.5 rounded-md p-0.5 transition-colors hover:bg-chrome-hover"
      >
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-pill bg-brand">
          <span className="text-badge font-semibold text-on-brand">{initial}</span>
        </div>
        <span className="block max-md:hidden max-w-[70px] truncate text-xs font-medium text-chrome-fg">
          {user?.first_name || user?.username}
        </span>
      </button>

      {open && createPortal(
        <div
          id="account-menu-portal"
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-56 bg-surface border border-border-token rounded-xl shadow-2xl py-1"
        >
          <p className="px-3 pt-2 pb-1 text-badge font-semibold text-fg-token truncate">
            {store?.name || 'Cardapidex'}
          </p>
          {ACCOUNT_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Fragment key={l.href}>
                {l.sectionHeader && (
                  <p className="overline px-3 pt-2.5 pb-1 border-t border-border-token mt-1">
                    {l.sectionHeader}
                  </p>
                )}
                <NavLink
                  to={l.href}
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-brand text-[var(--brand-strong)] font-medium' : 'text-fg-token hover:bg-surface-2'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{l.name}</span>
                </NavLink>
              </Fragment>
            );
          })}
          <button
            onClick={() => { close(); logout(); navigate('/login'); }}
            className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 text-sm text-fg-token hover:bg-surface-2 border-t border-border-token transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
};
