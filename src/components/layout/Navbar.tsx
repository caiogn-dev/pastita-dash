import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon, DevicePhoneMobileIcon, ChatBubbleLeftRightIcon, InboxIcon,
  ShoppingCartIcon, CreditCardIcon, CpuChipIcon, Cog6ToothIcon,
  ArrowRightOnRectangleIcon, BoltIcon, UserGroupIcon, ChevronDownIcon,
  TagIcon, Squares2X2Icon, XMarkIcon, BuildingStorefrontIcon, MegaphoneIcon,
  SparklesIcon, LinkIcon, DocumentTextIcon, DocumentChartBarIcon, EnvelopeIcon,
  PlusIcon, BuildingOfficeIcon, ClockIcon, Bars3Icon, ChatBubbleBottomCenterTextIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useStore } from '../../hooks/useStore';
import { useTotalUnreadCount, useWsConnected } from '../../stores/chatStore';
import { useAccountStore } from '../../stores/accountStore';
import { StoreSelector } from './StoreSelector';
import { ThemeToggle } from '../theme';
import { NotificationDropdown, PushNotificationToggle } from '../notifications';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** Quando presente, renderiza um cabeçalho de seção acima deste item */
  sectionHeader?: string;
}

interface NavSection {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  href?: string;
  badge?: string;
}

// Portal dropdown — rendered at document.body level, positioned via getBoundingClientRect
function PortalDropdown({
  section,
  anchorRef,
  onClose,
}: {
  section: NavSection;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const update = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
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
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-52 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl py-1"
    >
      {section.items.map((item) => (
        <React.Fragment key={item.href}>
          {item.sectionHeader && (
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 border-t border-gray-100 dark:border-zinc-800 first:border-t-0 mt-1 first:mt-0">
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
                  ? 'bg-primary-50 dark:bg-zinc-800 text-primary-700 dark:text-primary-400 font-medium'
                  : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.name}</span>
            {item.badge && (
              <span className="ml-auto text-[10px] bg-primary-100 dark:bg-zinc-700 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-medium">
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
  const location = useLocation();

  const isActive =
    section.items.some((i) => i.href !== '/' && location.pathname.startsWith(i.href)) ||
    (section.href === '/' ? location.pathname === '/' : !!section.href && location.pathname.startsWith(section.href));

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (!section.items.length && section.href) {
    return (
      <NavLink
        to={section.href}
        end={section.href === '/'}
        className={({ isActive: a }) =>
          `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            a
              ? 'bg-primary-50 dark:bg-zinc-800 text-primary-700 dark:text-primary-400'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'
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
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
          isActive || open
            ? 'bg-primary-50 dark:bg-zinc-800 text-primary-700 dark:text-primary-400'
            : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'
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
      {open && <PortalDropdown section={section} anchorRef={btnRef} onClose={close} />}
    </>
  );
}

export const Navbar: React.FC = () => {
  const { logout, user } = useAuthStore();
  const { store } = useStore();
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

  const sections: NavSection[] = useMemo(() => [
    { label: 'Início', icon: HomeIcon, href: '/', items: [] },

    // ── Operação diária ─────────────────────────────────────
    {
      label: 'Pedidos',
      icon: ShoppingCartIcon,
      href: storeHref('orders'),
      items: [],
    },
    {
      label: 'Chat',
      icon: ChatBubbleLeftRightIcon,
      href: '/inbox/whatsapp',
      badge: totalUnreadCount > 0 ? String(totalUnreadCount > 99 ? '99+' : totalUnreadCount) : undefined,
      items: [],
    },
    {
      label: 'PDV',
      icon: CreditCardIcon,
      items: [
        { name: 'Caixa',              href: storeHref('cash'),     icon: CreditCardIcon },
        { name: 'Modo Cozinha (KDS)', href: storeHref('kds'),      icon: ClockIcon },
        { name: 'Impressão',          href: storeHref('printing'), icon: DocumentTextIcon },
      ],
    },
    {
      label: 'Clientes',
      icon: UserGroupIcon,
      href: storeHref('customers'),
      items: [],
    },
    {
      label: 'Cardápio',
      icon: Squares2X2Icon,
      items: [
        { name: 'Produtos',  href: storeHref('products'), icon: Squares2X2Icon },
        { name: 'Combos',    href: storeHref('combos'),   icon: Squares2X2Icon },
        { name: 'Cupons',    href: storeHref('coupons'),  icon: TagIcon },
      ],
    },
    {
      label: 'Relatórios',
      icon: PresentationChartLineIcon,
      href: '/analytics',
      items: [],
    },

    // ── Crescimento ─────────────────────────────────────────
    {
      label: 'Marketing',
      icon: MegaphoneIcon,
      items: [
        { name: 'Campanhas WhatsApp', href: '/marketing/whatsapp',           icon: DevicePhoneMobileIcon, sectionHeader: 'Campanhas' },
        { name: 'Templates WhatsApp', href: '/marketing/whatsapp/templates', icon: DocumentTextIcon },
        { name: 'Campanhas Email',    href: '/marketing/email/campaigns',    icon: EnvelopeIcon },
        { name: 'Agentes IA',    href: '/agents',               icon: CpuChipIcon, badge: 'Beta', sectionHeader: 'Automação IA' },
        { name: 'Automações',    href: '/automation/companies', icon: BoltIcon },
        { name: 'Agendamentos',  href: '/automation/scheduled', icon: ClockIcon },
        { name: 'Logs IA',       href: '/automation/logs',      icon: DocumentChartBarIcon },
        { name: 'Handover',      href: '/whatsapp/handover',    icon: UserGroupIcon },
      ],
    },

    // ── Configuração ────────────────────────────────────────
    {
      label: 'Loja',
      icon: Cog6ToothIcon,
      items: [
        { name: 'Configurações', href: storeHref('settings'),   icon: Cog6ToothIcon, sectionHeader: 'Esta loja' },
        { name: 'Entrega',       href: storeHref('delivery'),   icon: ShoppingCartIcon },
        { name: 'Pagamentos',    href: storeHref('payments'),   icon: CreditCardIcon },
        { name: 'Storefront',    href: storeHref('storefront'), icon: BuildingStorefrontIcon },
        { name: 'Todas as Lojas',   href: '/stores',      icon: BuildingStorefrontIcon, sectionHeader: 'Conta' },
        { name: 'Contas WhatsApp',  href: '/accounts',    icon: DevicePhoneMobileIcon },
        { name: 'Conexões',         href: '/connections', icon: LinkIcon },
        { name: 'Sistema',          href: '/settings',    icon: Cog6ToothIcon },
      ],
    },
  ], [storeHref, totalUnreadCount]);

  const brandInfo = useMemo(() => {
    if (!store) return {
      name: 'Cardapidex',
      logo: '/cardapidex-logo.svg',
      initial: 'Cx',
      color: '#059669',
    };
    return {
      name: store.name || 'Cardapidex',
      logo: store.logo_url || null,
      initial: store.name?.[0]?.toUpperCase() || 'C',
      color: store.primary_color || '#059669',
    };
  }, [store]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3 px-4 h-12">

          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center flex-shrink-0">
            {brandInfo.logo ? (
              <img
                src={brandInfo.logo}
                alt={brandInfo.name}
                className="w-7 h-7 rounded-md object-cover"
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
          </button>

          {/* WS dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${wsConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}
            title={wsConnected ? 'Online' : 'Offline'}
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700 flex-shrink-0" />

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
                className="block max-xl:hidden rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-primary-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 max-w-[130px]"
              >
                <option value="">Todas as contas</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}

            <ThemeToggle />
            <PushNotificationToggle />
            <NotificationDropdown />

            <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200 dark:border-zinc-700">
              <div className="w-6 h-6 bg-primary-100 dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-semibold text-primary-700 dark:text-primary-400">
                  {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                </span>
              </div>
              <span className="block max-md:hidden text-xs font-medium text-gray-900 dark:text-white truncate max-w-[70px]">
                {user?.first_name || user?.username}
              </span>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Sair"
              >
                <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setMobileOpen(true)}
              className="hidden max-lg:block p-1.5 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
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
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-zinc-900 z-50 hidden max-lg:flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 dark:border-zinc-700 flex-shrink-0">
              <span className="font-bold text-sm text-gray-900 dark:text-white">{brandInfo.name}</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400">
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
                            ? 'bg-primary-50 dark:bg-zinc-800 text-primary-700 dark:text-primary-400'
                            : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                        }`
                      }
                    >
                      <section.icon className="w-4 h-4" />
                      {section.label}
                    </NavLink>
                  ) : (
                    <>
                      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                        {section.label}
                      </p>
                      {section.items.map((item) => (
                        <React.Fragment key={item.href}>
                          {item.sectionHeader && (
                            <p className="px-3 pt-2 pb-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-300 dark:text-zinc-600">
                              {item.sectionHeader}
                            </p>
                          )}
                          <NavLink
                            to={item.href}
                            end={item.href === '/'}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive
                                  ? 'bg-primary-50 dark:bg-zinc-800 text-primary-700 dark:text-primary-400 font-medium'
                                  : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
                              }`
                            }
                          >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            {item.name}
                            {item.badge && (
                              <span className="ml-auto text-[10px] bg-primary-100 dark:bg-zinc-700 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-medium">
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
            </nav>
          </div>
        </>
      )}
    </>
  );
};
