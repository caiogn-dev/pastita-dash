import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDownIcon,
  XMarkIcon, Bars3Icon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { AccountMenu, ACCOUNT_LINKS } from './AccountMenu';
import { useStore } from '../../hooks/useStore';
import { useAuthStore } from '../../stores/authStore';
import { useTotalUnreadCount, useWsConnected } from '../../stores/chatStore';
import { useAccountStore } from '../../stores/accountStore';
import { StoreSelector } from './StoreSelector';
import { ThemeToggle } from '../theme';
import { NotificationDropdown, PushNotificationToggle } from '../notifications';
import { buildNavSections, type NavSection } from './navSections';
import { useAutomationEnabled } from '../../hooks/useAutomationEnabled';

// Portal dropdown — rendered at document.body level, positioned via getBoundingClientRect
function PortalDropdown({
  section,
  anchorRef,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  section: NavSection;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const update = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      const dropdownWidth = 208; // w-52
      const left = Math.min(r.left, window.innerWidth - dropdownWidth - 8);
      setPos({ top: r.bottom + 6, left: Math.max(0, left) });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (anchorRef.current?.contains(e.target as Node)) return;
      const dropdown = document.getElementById('navbar-dropdown-portal');
      if (dropdown?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      id="navbar-dropdown-portal"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-52 bg-surface border border-border-token rounded-xl shadow-2xl py-1"
    >
      {section.items.map((item) => (
        <React.Fragment key={item.href}>
          {item.sectionHeader && (
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-muted-token border-t border-border-token first:border-t-0 mt-1 first:mt-0">
              {item.sectionHeader}
            </p>
          )}
          <NavLink
            to={item.href}
            end={item.href === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-brand text-[var(--brand-strong)] font-medium'
                  : 'text-fg-token hover:bg-surface-2'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.name}</span>
            {item.badge && (
              <span className="ml-auto text-[10px] bg-brand-soft text-brand px-1.5 py-0.5 rounded-full font-medium">
                {item.badge}
              </span>
            )}
          </NavLink>
        </React.Fragment>
      ))}
    </div>,
    document.body
  );
}

function NavBtn({ section }: { section: NavSection }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null!);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  const isActive =
    section.items.some((i) => i.href !== '/' && location.pathname.startsWith(i.href)) ||
    (section.href === '/' ? location.pathname === '/' : !!section.href && location.pathname.startsWith(section.href));

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);
  const close = useCallback(() => { clearCloseTimer(); setOpen(false); }, [clearCloseTimer]);
  // Abre no hover; fecha com pequeno atraso pra dar tempo de mover o mouse do
  // botão até o dropdown (que é um portal separado, sem relação DOM de hover).
  const openNow = useCallback(() => { clearCloseTimer(); setOpen(true); }, [clearCloseTimer]);
  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (!section.items.length && section.href) {
    return (
      <NavLink
        to={section.href}
        end={section.href === '/'}
        className={({ isActive: a }) =>
          `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            a
              ? 'bg-brand text-[var(--brand-strong)] font-medium'
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`
        }
      >
        <section.icon className="w-3.5 h-3.5 flex-shrink-0" />
        {section.label}
      </NavLink>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (open ? close() : openNow())}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
          isActive || open
            ? 'bg-brand text-[var(--brand-strong)] font-medium'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <section.icon className="w-3.5 h-3.5 flex-shrink-0" />
        {section.label}
        {section.badge && (
          <span className="text-[10px] bg-red-500 text-white px-1 py-0.5 rounded-full font-bold leading-none min-w-[16px] text-center">
            {section.badge}
          </span>
        )}
        <ChevronDownIcon className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <PortalDropdown
          section={section}
          anchorRef={btnRef}
          onClose={close}
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        />
      )}
    </>
  );
}

export const Navbar: React.FC = () => {
  const { store } = useStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const totalUnreadCount = useTotalUnreadCount();
  const wsConnected = useWsConnected();
  const { accounts, selectedAccount, setSelectedAccount } = useAccountStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const storeKey = store?.slug || store?.id || null;
  const storeHref = useMemo(
    () => (path: string) => storeKey ? `/stores/${storeKey}/${path}` : '/stores',
    [storeKey]
  );

  const automationEnabled = useAutomationEnabled();
  const sections: NavSection[] = useMemo(
    () => buildNavSections({
      storeHref,
      unreadBadge: totalUnreadCount > 0 ? String(totalUnreadCount > 99 ? '99+' : totalUnreadCount) : undefined,
      automationEnabled,
    }),
    [storeHref, totalUnreadCount, automationEnabled],
  );

  const brandInfo = useMemo(() => {
    if (!store) return {
      name: 'Cardapidex',
      logo: '/brand/symbol-256.png',
      initial: 'Cx',
      color: 'var(--brand)',
      isPlatform: true,
    };
    return {
      name: store.name || 'Cardapidex',
      logo: store.logo_url || null,
      initial: store.name?.[0]?.toUpperCase() || 'C',
      color: store.primary_color || '#C7492E',
      isPlatform: false,
    };
  }, [store]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <>
      <header
        className="sticky top-0 z-40 text-white backdrop-blur-xl"
        style={{
          background: 'linear-gradient(180deg, #1F1A15 0%, var(--brand-strong) 100%)',
          boxShadow: '0 10px 30px -16px rgba(0,0,0,0.7)',
        }}
      >
        {/* hairline dourado na base */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(222,190,121,0.45) 50%, transparent 100%)',
          }}
        />
        <div className="flex items-center gap-3 px-4 h-24">

          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2 flex-shrink-0">
            {brandInfo.logo ? (
              <img
                src={brandInfo.logo}
                alt={brandInfo.name}
                className="w-7 h-7 rounded-md object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                style={{ background: brandInfo.color }}
              >
                {brandInfo.initial}
              </div>
            )}
            {brandInfo.isPlatform && (
              <span className="hidden sm:block text-lg tracking-[0.18em] uppercase text-[var(--brand)] font-brand">
                Cardapidex
              </span>
            )}
          </button>

          {/* WS dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${wsConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}
            title={wsConnected ? 'Online' : 'Offline'}
          />

          <div className="w-px h-5 bg-white/20 flex-shrink-0" />

          {/* Desktop nav — no overflow scroll */}
          <nav className="flex max-lg:hidden items-center gap-0.5 flex-1 min-w-0">
            {sections.map((s) => <NavBtn key={s.label} section={s} />)}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            <div className="block max-sm:hidden">
              <StoreSelector />
            </div>

            {accounts.length > 0 && (
              <select
                value={selectedAccount?.id || ''}
                onChange={(e) => setSelectedAccount(accounts.find((a) => a.id === e.target.value) || null)}
                className="block max-xl:hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs text-white outline-none focus:border-white/40 max-w-[130px]"
              >
                <option value="">Todas as contas</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}

            <ThemeToggle />
            <PushNotificationToggle />
            <NotificationDropdown />

            <AccountMenu />

            <button
              onClick={() => setMobileOpen(true)}
              className="hidden max-lg:block p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Abrir menu de navegação"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 hidden max-lg:block" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-surface z-50 hidden max-lg:flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 h-12 bg-[var(--brand-strong)] text-white border-b border-[var(--border)] flex-shrink-0">
              <span className="font-bold text-sm text-white">{brandInfo.name}</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white" aria-label="Fechar menu de navegação">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-2">
              {sections.map((section) => (
                <div key={section.label}>
                  {section.items.length === 0 && section.href ? (
                    <NavLink
                      to={section.href}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-brand text-[var(--brand-strong)] font-medium'
                            : 'text-fg-token hover:bg-surface-2'
                        }`
                      }
                    >
                      <section.icon className="w-4 h-4" />
                      {section.label}
                    </NavLink>
                  ) : (
                    <>
                      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-muted-token">
                        {section.label}
                      </p>
                      {section.items.map((item) => (
                        <React.Fragment key={item.href}>
                          {item.sectionHeader && (
                            <p className="px-3 pt-2 pb-0.5 text-[10px] font-medium uppercase tracking-wider text-fg-muted-token">
                              {item.sectionHeader}
                            </p>
                          )}
                          <NavLink
                            to={item.href}
                            end={item.href === '/'}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive
                                  ? 'bg-brand text-[var(--brand-strong)] font-medium'
                                  : 'text-fg-token hover:bg-surface-2'
                              }`
                            }
                          >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            {item.name}
                            {item.badge && (
                              <span className="ml-auto text-[10px] bg-brand-soft text-brand px-1.5 py-0.5 rounded-full font-medium">
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </div>
              ))}
              {/* Conta — no mobile não há avatar-dropdown, então os itens de conta entram aqui */}
              <div className="mt-2 border-t border-[var(--border)] pt-2">
                <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-muted-token">
                  Conta
                </p>
                {ACCOUNT_LINKS.map((l) => (
                  <NavLink
                    key={l.href}
                    to={l.href}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-brand text-[var(--brand-strong)] font-medium' : 'text-fg-token hover:bg-surface-2'
                      }`
                    }
                  >
                    <l.icon className="w-4 h-4 flex-shrink-0" />
                    {l.name}
                  </NavLink>
                ))}
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-fg-token hover:bg-surface-2 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 flex-shrink-0" />
                  Sair
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
};
