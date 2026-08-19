import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { useNavSections } from './useNavSections';
import { TrialBanner } from './TrialBanner';
import { useIsMobileViewport } from '../../mobile/useIsMobileViewport';
import { MobileShell } from '../../mobile/MobileShell';
import { useAuthStore } from '../../stores/authStore';
import { classeDeAltura } from './alturaDaCasca';

/**
 * Casca do desktop: coluna de navegação à esquerda, barra de identidade em
 * cima, conteúdo no resto.
 *
 * A coluna é `sticky h-screen` e o conteúdo rola por conta própria — assim o
 * menu nunca sai de vista, que é o ponto de trocar a navbar horizontal por
 * ela.
 */
const Casca: React.FC<{
  children: React.ReactNode;
  comBanner?: boolean;
  /** Rota de tela cheia (inbox, KDS): prende a casca na viewport. Ver alturaDaCasca. */
  alturaFixa?: boolean;
}> = ({
  children,
  comBanner = true,
  alturaFixa = false,
}) => {
  const sections = useNavSections();
  const navigate = useNavigate();
  const [paletaAberta, setPaletaAberta] = useState(false);

  // Ctrl+K / Cmd+K de qualquer lugar. O atalho vive na CASCA, não numa página:
  // ele precisa funcionar inclusive de dentro do quadro de pedidos, que é onde
  // o operador passa o dia e de onde sair custa mais.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletaAberta((v) => !v);
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  return (
    <div className={`relative flex ${classeDeAltura(alturaFixa)} bg-bg-secondary text-fg-primary`}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(201, 162, 75, 0.08), transparent 55%)',
        }}
      />
      <div className="max-lg:hidden">
        <Sidebar sections={sections} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar semNavegacaoDesktop onAbrirBusca={() => setPaletaAberta(true)} />
        {comBanner && <TrialBanner />}
        {children}
      </div>
      <CommandPalette
        aberto={paletaAberta}
        onFechar={() => setPaletaAberta(false)}
        sections={sections}
        onNavegar={navigate}
      />
    </div>
  );
};

export const MainLayout: React.FC = () => {
  const location = useLocation();

  // Só o BOARD de pedidos é full-bleed (tem chrome próprio). Sub-rotas como
  // /orders/new e /orders/:id ganham o shell normal (navbar + banner) — antes a
  // regex engolia tudo e a OrderNewPage renderizava órfã, sem navegação.
  const isDedicatedOrderRoute = /^\/stores\/[^/]+\/orders\/?$/.test(location.pathname);
  const isFullscreenRoute = /^\/(whatsapp\/(inbox|chat)|conversations|inbox)/.test(location.pathname);

  const isMobile = useIsMobileViewport();
  const isAuthed = useAuthStore((s) => s.isAuthenticated);

  // Phone-sized + authenticated: render the mobile shell instead of the desktop
  // chrome. Fullscreen routes (inbox/chat) keep their own full-bleed layout.
  if (isMobile && isAuthed && !isFullscreenRoute) {
    return <MobileShell />;
  }

  // O quadro de pedidos era a única tela SEM saída do painel: navbar escondida,
  // nenhum botão de voltar, e quem entrava por link direto ficava preso até
  // digitar outra URL. Ele mantém o chrome próprio (sem banner de trial, sem
  // padding), mas ganha a coluna lateral — a saída.
  if (isDedicatedOrderRoute) {
    return (
      <Casca comBanner={false}>
        <div className="flex-1 overflow-auto bg-canvas text-fg-token">
          <Outlet />
        </div>
      </Casca>
    );
  }

  if (isFullscreenRoute) {
    return (
      // `alturaFixa`: sem teto de altura na raiz, `h-full`/`height: 100%` das
      // camadas de baixo resolvem contra um pai que cresce — o chat empurrava
      // a página e a coluna de conversas saía da tela.
      <Casca alturaFixa>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </Casca>
    );
  }

  return (
    <Casca>
      {/* SEM z-index aqui. `main` é flex item, e pela spec do Flexbox um z-index
          num flex item cria stacking context mesmo com position static. Com
          z-10, a navbar irmã (sticky z-40, opaca) pintava acima de TODA a
          subárvore da página — nenhum drawer adiantava declarar z-50 ou z-[60],
          e os 64px do topo (título e botão X) ficavam inalcançáveis em 11
          superfícies. */}
      <main className="flex-1 overflow-auto bg-transparent px-7 py-5 max-xl:px-5 max-md:px-3 max-md:py-3">
        <Outlet />
      </main>
    </Casca>
  );
};

export default MainLayout;
