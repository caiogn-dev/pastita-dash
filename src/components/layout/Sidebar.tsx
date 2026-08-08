/**
 * Sidebar — a navegação do painel numa coluna que rola.
 *
 * A navbar horizontal media a largura disponível e empurrava o excedente para
 * um dropdown "Mais". Duas consequências ruins:
 *
 *   1. A mesma função ficava em lugares diferentes dependendo do tamanho da
 *      janela. O usuário aprende por posição, e a posição mudava.
 *   2. Quem nunca clicou em "Mais" não sabe que a Fidelidade existe. Feature
 *      escondida atrás de um rótulo genérico é feature que não existe.
 *
 * Uma coluna vertical não tem esse problema: ela rola. Sempre cabe.
 *
 * ACORDEÃO COM UM GRUPO ABERTO POR VEZ. Vários grupos abertos transformam a
 * coluna numa lista de 40 itens onde a hierarquia some — e o objetivo da
 * hierarquia é justamente reduzir o que você lê de uma vez. O grupo da página
 * atual abre sozinho, então chegar numa tela já mostra onde ela mora.
 *
 * Este componente é DESKTOP. No celular quem manda é a MobileShell.
 */
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDownIcon, ChevronDoubleLeftIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';
import { NavSection } from './navSections';

export interface SidebarProps {
  sections: NavSection[];
  className?: string;
}

/** O caminho casa com o destino, incluindo sub-rotas (`/orders/123`). */
function ativo(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function secaoAtiva(pathname: string, secao: NavSection): boolean {
  if (secao.href && ativo(pathname, secao.href)) return true;
  return secao.items.some((i) => ativo(pathname, i.href));
}

export const Sidebar: React.FC<SidebarProps> = ({ sections, className }) => {
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState<string | null>(null);
  const [recolhido, setRecolhido] = useState(false);

  // O grupo da rota atual abre sozinho a cada navegação. Sem isso, entrar em
  // /combos por link direto deixa o menu mostrando outra coisa.
  useEffect(() => {
    const dono = sections.find((s) => s.items.length > 0 && secaoAtiva(pathname, s));
    if (dono) setAberto(dono.label);
  }, [pathname, sections]);

  const largura = recolhido ? 'w-16' : 'w-64';

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-border-token bg-surface transition-[width] duration-150',
        largura,
        className
      )}
    >
      <div className="flex items-center justify-end px-2 py-3">
        <button
          type="button"
          onClick={() => setRecolhido((v) => !v)}
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          className="rounded p-1.5 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ChevronDoubleLeftIcon
            className={cn('h-4 w-4 transition-transform', recolhido && 'rotate-180')}
          />
        </button>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {sections.map((secao) => {
          const Icone = secao.icon;
          const temFilhos = secao.items.length > 0;
          const estaAtiva = secaoAtiva(pathname, secao);
          const estaAberta = aberto === secao.label;

          // Seção sem filhos é um link direto — não vira botão de acordeão.
          if (!temFilhos && secao.href) {
            return (
              <li key={secao.label}>
                <Link
                  to={secao.href}
                  aria-current={estaAtiva ? 'page' : undefined}
                  title={recolhido ? secao.label : undefined}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-body font-medium',
                    'transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                    estaAtiva
                      ? 'bg-brand-soft text-brand-ink'
                      : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
                  )}
                >
                  {/* Barra da marca que ESTICA ao entrar.
                      O item ativo era só um fundo cinza — indistinguível do
                      hover, e sem nada da identidade. A barra dourada marca
                      onde você está com a cor da loja, e a curva elástica
                      (--mola) faz ela parecer matéria: estica na largada,
                      corre no meio, desacelera no fim. Retângulo que aparece
                      pronto lê como troca de tela; este lê como movimento. */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-pill bg-brand',
                      'transition-[height,opacity] duration-300',
                      estaAtiva ? 'h-5 opacity-100' : 'h-0 opacity-0'
                    )}
                    style={{ transitionTimingFunction: 'var(--mola)' }}
                  />
                  <Icone className={cn('h-5 w-5 shrink-0', estaAtiva && 'text-brand-ink')} />
                  {/* Recolhido esconde o rótulo VISUALMENTE, nunca do leitor de
                      tela — senão a coluna vira uma fileira de ícones mudos. */}
                  <span className={cn('truncate', recolhido && 'sr-only')}>{secao.label}</span>
                  {secao.badge && !recolhido && (
                    <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-badge font-bold text-on-brand">
                      {secao.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          }

          return (
            <li key={secao.label}>
              <button
                type="button"
                aria-expanded={estaAberta}
                onClick={() => setAberto(estaAberta ? null : secao.label)}
                title={recolhido ? secao.label : undefined}
                className={cn(
                  'relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-body font-medium',
                  'transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  estaAtiva
                    ? 'bg-brand-soft text-brand-ink'
                    : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-pill bg-brand',
                    'transition-[height,opacity] duration-300',
                    estaAtiva ? 'h-5 opacity-100' : 'h-0 opacity-0'
                  )}
                  style={{ transitionTimingFunction: 'var(--mola)' }}
                />
                <Icone className={cn('h-5 w-5 shrink-0', estaAtiva && 'text-brand-ink')} />
                <span className={cn('truncate', recolhido && 'sr-only')}>{secao.label}</span>
                {!recolhido && (
                  <ChevronDownIcon
                    className={cn(
                      'ml-auto h-4 w-4 shrink-0 transition-transform',
                      estaAberta && 'rotate-180'
                    )}
                    aria-hidden
                  />
                )}
              </button>

              {estaAberta && (
                <ul className={cn('mt-0.5 space-y-0.5', !recolhido && 'ml-4 border-l border-border-token pl-2')}>
                  {secao.items.map((item) => {
                    const ItemIcone = item.icon;
                    const itemAtivo = ativo(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          aria-current={itemAtivo ? 'page' : undefined}
                          title={recolhido ? item.name : undefined}
                          className={cn(
                            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-body transition-colors duration-200',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                            itemAtivo
                              ? 'bg-brand-soft font-semibold text-brand-ink'
                              : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
                          )}
                        >
                          <ItemIcone className="h-4 w-4 shrink-0" />
                          <span className={cn('truncate', recolhido && 'sr-only')}>
                            {item.name}
                          </span>
                          {item.badge && !recolhido && (
                            <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-badge font-bold text-fg-muted-token">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

Sidebar.displayName = 'Sidebar';

export default Sidebar;
