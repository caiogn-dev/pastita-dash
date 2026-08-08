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
import { ChevronDownIcon, ChevronDoubleLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';
import { NavItem, NavSection } from './navSections';

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

/**
 * Um item do menu — e a decisão de abrir aqui ou em aba própria.
 *
 * A Central de Pedidos fica aberta o expediente inteiro: navegar para dentro
 * dela pelo menu faz perder o lugar toda vez. Mas link que rouba para outra
 * aba SEM AVISAR é um dos incômodos clássicos de web, então o contrato é
 * visível — ícone de "abre fora" para quem vê, texto para quem ouve.
 *
 * A aba é nomeada: clicar cinco vezes durante o turno reaproveita a mesma em
 * vez de empilhar cinco cópias da tela.
 */
const ItemDeMenu: React.FC<{
  item: NavItem;
  ativo: boolean;
  Icone: React.ComponentType<{ className?: string }>;
  rotuloOculto?: boolean;
}> = ({ item, ativo: itemAtivo, Icone, rotuloOculto }) => {
  const classe = cn(
    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-body transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
    itemAtivo
      ? 'bg-brand-soft font-semibold text-brand-ink'
      : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
  );

  const miolo = (
    <>
      <Icone className="h-4 w-4 shrink-0" />
      <span className={cn('truncate', rotuloOculto && 'sr-only')}>{item.name}</span>
      {item.novaAba && (
        <>
          <ArrowTopRightOnSquareIcon className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="sr-only">(abre em nova aba)</span>
        </>
      )}
      {item.badge && !rotuloOculto && !item.novaAba && (
        <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-badge font-bold text-fg-muted-token">
          {item.badge}
        </span>
      )}
    </>
  );

  if (item.novaAba) {
    return (
      <a
        href={item.href}
        // `aria-current` descreve a RELAÇÃO com a página atual, não o
        // comportamento do clique — continua verdadeiro e útil aqui.
        aria-current={itemAtivo ? 'page' : undefined}
        // Nome fixo: a segunda visita foca a aba existente.
        target="central-de-pedidos"
        // `noopener`: sem isto a aba nova recebe `window.opener` e consegue
        // manipular a aba de origem.
        rel="noopener noreferrer"
        title={rotuloOculto ? item.name : undefined}
        className={classe}
      >
        {miolo}
      </a>
    );
  }

  return (
    <Link
      to={item.href}
      aria-current={itemAtivo ? 'page' : undefined}
      title={rotuloOculto ? item.name : undefined}
      className={classe}
    >
      {miolo}
    </Link>
  );
};

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

  // 72px e não 64: com 64 o ícone de 20px ficava com 22px de folga de cada
  // lado, e o alvo de clique encostava na borda da tela. 72 dá respiro e
  // permite o ícone maior sem apertar.
  const largura = recolhido ? 'w-[72px]' : 'w-64';
  const tamIcone = recolhido ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-border-token bg-surface',
        // A largura anima com a MESMA curva elástica do indicador ativo:
        // recolher e expandir é movimento de matéria, não corte de frame.
        'transition-[width] duration-300',
        largura,
        className
      )}
      style={{ transitionTimingFunction: 'var(--mola)' }}
    >
      {/* Marca no topo. A coluna abria direto nos itens, sem nada dizendo de
          que produto é a tela — e recolhida virava uma faixa de ícones órfã. */}
      <div className="flex items-center gap-2 px-3 py-3">
        <Link
          to="/"
          aria-label="Cardapidex — ir para o início"
          className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <img
            src="/brand/symbol-256.png"
            alt=""
            className="h-8 w-8 shrink-0 rounded-md object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {!recolhido && (
            <span className="truncate font-brand text-lead uppercase tracking-[0.16em] text-brand-ink">
              Cardapidex
            </span>
          )}
        </Link>

        {!recolhido && (
          <button
            type="button"
            onClick={() => setRecolhido(true)}
            aria-label="Recolher menu"
            className="ml-auto rounded-md p-1.5 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {recolhido && (
        <button
          type="button"
          onClick={() => setRecolhido(false)}
          aria-label="Expandir menu"
          className="mx-auto mb-1 rounded-md p-1.5 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ChevronDoubleLeftIcon className="h-4 w-4 rotate-180" />
        </button>
      )}

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
                    'relative flex items-center gap-2.5 rounded-md py-2 text-body font-medium',
                    recolhido ? 'justify-center px-0' : 'px-2.5',
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
                  <Icone className={cn(tamIcone, 'shrink-0', estaAtiva && 'text-brand-ink')} />
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
                onClick={() => {
                  // Recolhida, abrir um grupo mostrava os filhos como ícones
                  // mudos empilhados — você clicava em "Cardápio" e recebia
                  // cinco quadradinhos sem nome. O gesto de abrir um grupo é
                  // um pedido para VER o grupo: a coluna expande junto.
                  if (recolhido) {
                    setRecolhido(false);
                    setAberto(secao.label);
                    return;
                  }
                  setAberto(estaAberta ? null : secao.label);
                }}
                title={recolhido ? secao.label : undefined}
                className={cn(
                  'relative flex w-full items-center gap-2.5 rounded-md py-2 text-body font-medium',
                  recolhido ? 'justify-center px-0' : 'px-2.5',
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
                <Icone className={cn(tamIcone, 'shrink-0', estaAtiva && 'text-brand-ink')} />
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
                        <ItemDeMenu
                          item={item}
                          ativo={itemAtivo}
                          Icone={ItemIcone}
                          rotuloOculto={recolhido}
                        />
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
