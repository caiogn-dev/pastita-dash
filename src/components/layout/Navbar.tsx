import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDownIcon,
  XMarkIcon, Bars3Icon,
  ArrowRightOnRectangleIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { AccountMenu, ACCOUNT_LINKS } from './AccountMenu';
import { useStore } from '../../hooks/useStore';
import { useAuthStore } from '../../stores/authStore';
import { useTotalUnreadCount, useWsConnected } from '../../stores/chatStore';
import { useAccountStore } from '../../stores/accountStore';
import { StoreSelector } from './StoreSelector';
import { ThemeToggle } from '../theme';
import { NotificationDropdown } from '../notifications';
import { buildNavSections, type NavSection } from './navSections';
import { useAutomationEnabled } from '../../hooks/useAutomationEnabled';

/**
 * Glifo do WhatsApp.
 *
 * Os heroicons não têm marca de terceiro, e `ChatBubble` genérico não diz de
 * QUAL canal se trata — o painel tem conta de usuário, de loja e de pagamento,
 * e "Todas as contas" sozinho é ambíguo. Desenhado inline para não puxar um
 * pacote de ícones de marca inteiro por causa de um símbolo.
 *
 * `currentColor` de propósito: acompanha o tema do cromo em vez de fixar o
 * verde da marca, que sobre o carvão do tema escuro fica sujo.
 */
const WhatsAppGlifo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.23 8.23 0 0 1 0 16.47z" />
  </svg>
);

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
            <p className="overline px-3 pt-2.5 pb-1 border-t border-border-token first:border-t-0 mt-1 first:mt-0">
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
              <span className="ml-auto text-badge bg-brand-soft text-brand-ink px-1.5 py-0.5 rounded-full font-medium">
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
          `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            a
              ? 'bg-brand text-[var(--brand-strong)] font-medium'
              : 'text-chrome-muted hover:bg-chrome-hover hover:text-chrome-fg'
          }`
        }
      >
        <section.icon className="w-4 h-4 flex-shrink-0" />
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
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
          isActive || open
            ? 'bg-brand text-[var(--brand-strong)] font-medium'
            : 'text-chrome-muted hover:bg-chrome-hover hover:text-chrome-fg'
        }`}
      >
        <section.icon className="w-4 h-4 flex-shrink-0" />
        {section.label}
        {section.badge && (
          <span className="text-badge bg-red-500 text-white px-1 py-0.5 rounded-full font-bold leading-none min-w-[16px] text-center">
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

/**
 * Overflow "priority+" da nav desktop: mede a largura real de cada seção numa
 * cópia invisível e calcula quantas cabem no container; o resto vai pro
 * dropdown "Mais". Antes o container era overflow-x com scrollbar escondida —
 * o último item era CORTADO em silêncio (ex.: "Configuraç" em ~1568px).
 */
function useOverflowNav(sectionCount: number) {
  const containerRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(sectionCount);

  useEffect(() => {
    const MORE_BTN_W = 96; // botão "Mais" + folga
    const GAP_W = 2; // gap-0.5
    const compute = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;
      const available = container.clientWidth;
      const widths = Array.from(measure.children).map(
        (c) => (c as HTMLElement).offsetWidth + GAP_W,
      );
      if (!widths.length || available <= 0) return;
      const total = widths.reduce((a, b) => a + b, 0);
      if (total <= available) {
        setVisibleCount(widths.length);
        return;
      }
      let used = 0;
      let count = 0;
      for (const w of widths) {
        if (used + w + MORE_BTN_W > available) break;
        used += w;
        count += 1;
      }
      setVisibleCount(count);
    };
    compute();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [sectionCount]);

  return { containerRef, measureRef, visibleCount };
}

export interface NavbarProps {
  /**
   * Some com a navegação horizontal do desktop.
   *
   * Quando a coluna lateral está na tela, repetir as mesmas seções em cima é
   * pior que redundante: são dois alvos para a mesma ação, e o usuário passa a
   * duvidar se levam ao mesmo lugar. A barra vira só identidade + controles de
   * conta. No celular a lateral não existe, então o drawer continua.
   */
  semNavegacaoDesktop?: boolean;
  /**
   * Abre a paleta de comandos.
   *
   * O atalho Ctrl+K é invisível para quem nunca leu sobre ele — o botão
   * existe para ENSINAR o atalho, mostrando a tecla ao lado da lupa. Sem ele,
   * a paleta serve só a quem já sabia que ela existe.
   */
  onAbrirBusca?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ semNavegacaoDesktop = false, onAbrirBusca }) => {
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

  const { containerRef, measureRef, visibleCount } = useOverflowNav(sections.length);
  const visibleSections = sections.slice(0, visibleCount);
  const hiddenSections = sections.slice(visibleCount);
  // Seções que não couberam viram itens do dropdown "Mais" (seções com
  // sub-itens são achatadas com cabeçalho; links diretos viram item simples).
  const overflowSection: NavSection | null = hiddenSections.length
    ? {
        label: 'Mais',
        icon: EllipsisHorizontalIcon,
        items: hiddenSections.flatMap((s) =>
          s.items.length
            ? s.items.map((it, i) => (i === 0 ? { ...it, sectionHeader: s.label } : it))
            : [{ name: s.label, href: s.href!, icon: s.icon, badge: s.badge }],
        ),
      }
    : null;

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-chrome-border text-chrome-fg backdrop-blur-xl"
        style={{
          // Gradiente vertical sutil em vez de cor chapada: dá espessura à
          // barra sem sombra pesada, e funciona nos dois temas porque as duas
          // pontas são token.
          background: 'linear-gradient(180deg, var(--chrome-bg) 0%, var(--chrome-bg-to) 100%)',
        }}
      >
        {/* Fio de ouro na base. No tema escuro é o que separa a barra do
            conteúdo; no claro a --chrome-border já faz esse trabalho e o fio
            some (o token cai para transparente). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, var(--chrome-hairline, transparent) 50%, transparent 100%)',
          }}
        />
        <div className="flex items-center gap-3 px-4 h-16">

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
              <span className="hidden sm:block text-lg tracking-[0.18em] uppercase text-brand-ink font-brand">
                Cardapidex
              </span>
            )}
          </button>

          {/* WS dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${wsConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}
            title={wsConnected ? 'Online' : 'Offline'}
          />

          <div className="w-px h-5 bg-chrome-border flex-shrink-0" />

          {/* Desktop nav — itens que não cabem caem no dropdown "Mais" (nunca corta).
              Com a coluna lateral na tela, some: duas navegações para os mesmos
              destinos ensinam o operador duas vezes. */}
          {!semNavegacaoDesktop && (
            <>
              <nav
                ref={containerRef}
                className="flex max-lg:hidden items-center gap-0.5 flex-1 min-w-0 overflow-hidden"
              >
                {visibleSections.map((s) => <NavBtn key={s.label} section={s} />)}
                {overflowSection && <NavBtn section={overflowSection} />}
              </nav>
              {/* Cópia invisível só pra medição de largura (nunca interativa) */}
              <div
                ref={measureRef}
                aria-hidden
                className="max-lg:hidden pointer-events-none invisible fixed top-0 left-0 flex items-center gap-0.5 whitespace-nowrap"
              >
                {sections.map((s) => <NavBtn key={s.label} section={s} />)}
              </div>
            </>
          )}

          {/* Right side */}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            <div className="block max-sm:hidden">
              <StoreSelector />
            </div>

            {/* Filtro de conta de WhatsApp — só faz sentido com MAIS DE UMA.
                Com uma conta, "Todas as contas" e o nome dela levam ao mesmo
                lugar: um controle que não muda nada, ocupando espaço no cromo
                e ensinando o operador a ignorar aquela região. A maioria das
                lojas tem uma conta só. */}
            {accounts.length > 1 && (
              // O ícone do WhatsApp identifica DE QUE conta se trata. Sem ele o
              // controle dizia só "Todas as contas" — e "conta" no painel pode
              // ser conta de usuário, de loja ou de pagamento. O glifo resolve
              // a ambiguidade sem gastar largura com a palavra "WhatsApp".
              <label className="flex max-xl:hidden items-center gap-1.5 rounded-lg border border-chrome-border bg-chrome-hover px-2 py-1 text-chrome-muted focus-within:border-brand">
                <WhatsAppGlifo className="h-4 w-4 shrink-0" />
                <span className="sr-only">Filtrar por conta de WhatsApp</span>
                <select
                  value={selectedAccount?.id || ''}
                  onChange={(e) => setSelectedAccount(accounts.find((a) => a.id === e.target.value) || null)}
                  className="max-w-[120px] cursor-pointer border-0 bg-transparent text-xs text-chrome-fg outline-none"
                >
                  <option value="">Todas as contas</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
            )}

            {onAbrirBusca && (
              <button
                type="button"
                onClick={onAbrirBusca}
                aria-label="Buscar tela (Ctrl+K)"
                className="flex max-sm:hidden items-center gap-2 rounded-lg border border-chrome-border bg-chrome-hover px-2.5 py-1.5 text-xs text-chrome-muted transition-colors hover:border-brand hover:text-chrome-fg"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                <span className="max-lg:hidden">Ir para…</span>
                <kbd className="rounded border border-chrome-border px-1 text-badge leading-4">
                  Ctrl K
                </kbd>
              </button>
            )}

            <ThemeToggle />
            <NotificationDropdown />

            <AccountMenu />

            <button
              onClick={() => setMobileOpen(true)}
              className="hidden max-lg:block p-1.5 text-chrome-muted hover:text-chrome-fg hover:bg-chrome-hover rounded-lg transition-colors"
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
            <div className="flex items-center justify-between px-4 h-12 bg-chrome text-chrome-fg border-b border-chrome-border flex-shrink-0">
              <span className="font-bold text-sm text-chrome-fg">{brandInfo.name}</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-chrome-hover text-chrome-muted hover:text-chrome-fg" aria-label="Fechar menu de navegação">
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
                      <p className="overline px-3 pt-3 pb-1">
                        {section.label}
                      </p>
                      {section.items.map((item) => (
                        <React.Fragment key={item.href}>
                          {item.sectionHeader && (
                            <p className="overline px-3 pt-2 pb-0.5">
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
                              <span className="ml-auto text-badge bg-brand-soft text-brand-ink px-1.5 py-0.5 rounded-full font-medium">
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
                <p className="overline px-3 pt-1 pb-1">
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
