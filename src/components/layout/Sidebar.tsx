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
import React, { Fragment, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDownIcon, ChevronDoubleLeftIcon } from '@heroicons/react/24/outline';

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
 * Extraído porque o mesmo item aparece nos dois desenhos de seção (acordeão
 * puro e seção com destino próprio) — duplicar o markup fazia os dois
 * divergirem em foco e estado ativo.
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
      {item.badge && !rotuloOculto && (
        <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-badge font-bold text-fg-muted-token">
          {item.badge}
        </span>
      )}
    </>
  );

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
  // Espiada por ponteiro/teclado. É SEPARADA de `recolhido` de propósito: o
  // clique é a preferência do usuário ("quero a coluna estreita"), o hover é
  // só uma consulta. Se o hover escrevesse na preferência, o primeiro passar
  // de mouse deixaria a coluna larga para sempre.
  const [espiando, setEspiando] = useState(false);

  // O grupo da rota atual abre sozinho a cada navegação. Sem isso, entrar em
  // /combos por link direto deixa o menu mostrando outra coisa.
  useEffect(() => {
    const dono = sections.find((s) => s.items.length > 0 && secaoAtiva(pathname, s));
    if (dono) setAberto(dono.label);
  }, [pathname, sections]);

  // O modo ícone é a PREFERÊNCIA; `estreita` é o que a tela mostra agora.
  // Enquanto o ponteiro (ou o foco) está na coluna, ela mostra tudo.
  const estreita = recolhido && !espiando;
  const espiada = recolhido && espiando;

  // 72px e não 64: com 64 o ícone de 20px ficava com 22px de folga de cada
  // lado, e o alvo de clique encostava na borda da tela. 72 dá respiro e
  // permite o ícone maior sem apertar.
  const largura = estreita ? 'w-[72px]' : 'w-64';
  const tamIcone = estreita ? 'h-6 w-6' : 'h-5 w-5';

  return (
    // O invólucro segura o ESPAÇO da coluna na preferência do usuário. Sem ele,
    // a espiada empurraria o conteúdo da página 184px para o lado a cada passar
    // de mouse — a tela inteira tremendo por um gesto que não pediu nada. Aqui
    // a coluna expandida flutua POR CIMA e devolve o espaço intacto ao sair.
    <div
      className={cn('relative shrink-0', recolhido ? 'w-[72px]' : 'w-64', className)}
      onMouseEnter={() => setEspiando(true)}
      onMouseLeave={() => setEspiando(false)}
      // Quem navega por Tab não tem ponteiro: sem isto o teclado ficaria preso
      // numa fileira de ícones enquanto o mouse ganha a coluna inteira.
      onFocusCapture={() => setEspiando(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEspiando(false);
      }}
    >
    <nav
      aria-label="Navegação principal"
      className={cn(
        'sticky top-0 flex h-screen flex-col border-r border-border-token bg-surface',
        // A largura anima com a MESMA curva elástica do indicador ativo:
        // recolher e expandir é movimento de matéria, não corte de frame.
        'transition-[width] duration-300',
        largura,
        // A coluna TRANSBORDA do invólucro de 72px (nada corta) e sobe de
        // camada. Continua `sticky`, não `absolute`: absoluto se ancoraria no
        // topo da PÁGINA, e a coluna precisa acompanhar a rolagem da janela.
        // A sombra é o que faz ela ler como camada de cima — sem ela o
        // conteúdo atrás encosta e as duas viram a mesma superfície.
        // z-50 e não z-40: a Navbar também é z-40 e vem DEPOIS no DOM
        // (MainLayout renderiza Sidebar antes de Navbar). Com z-index empatado
        // quem pinta por cima é o último — a coluna expandia e sumia atrás da
        // navbar, dando a impressão de que o hover não funcionava. Só clicando
        // a seta ela aparecia, porque aí o espaço entra no fluxo em vez de
        // flutuar. Precisa ser MAIOR, não igual.
        espiada && 'z-50 shadow-2xl'
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
          {!estreita && (
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

      {/* Durante a espiada a coluna JÁ está larga, então este botão deixa de
          significar "abrir" e passa a significar "deixar assim" — o rótulo
          precisa dizer isso, senão o operador clica esperando outra coisa. */}
      {recolhido && (
        <button
          type="button"
          onClick={() => setRecolhido(false)}
          aria-label={espiada ? 'Fixar menu aberto' : 'Expandir menu'}
          className={cn(
            'mb-1 rounded-md p-1.5 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
            espiada ? 'mr-3 self-end' : 'mx-auto',
          )}
        >
          <ChevronDoubleLeftIcon className="h-4 w-4 rotate-180" />
        </button>
      )}

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {sections.map((secao, indice) => {
          const Icone = secao.icon;
          const temFilhos = secao.items.length > 0;
          const estaAtiva = secaoAtiva(pathname, secao);
          const estaAberta = aberto === secao.label;
          // Cabeçalho do bloco só na PRIMEIRA seção dele. Onze seções numa
          // lista corrida obrigam a ler tudo para achar uma; o bloco diz de
          // longe se aquilo é coisa de hoje, de catálogo, de crescer ou de
          // ajuste. Recolhida a coluna vira um traço: o texto não caberia, mas
          // a separação ainda vale.
          const primeiraDoGrupo = secao.grupo && sections[indice - 1]?.grupo !== secao.grupo;
          const cabecalhoDoGrupo = primeiraDoGrupo ? (
            estreita ? (
              <li aria-hidden className="mx-auto my-2 h-px w-6 bg-border-token" />
            ) : (
              <li
                className={cn(
                  'px-2.5 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-fg-muted-token/70',
                  indice === 0 ? 'pt-1' : 'pt-4',
                )}
              >
                {secao.grupo}
              </li>
            )
          ) : null;

          // Seção sem filhos é um link direto — não vira botão de acordeão.
          if (!temFilhos && secao.href) {
            return (
              <Fragment key={secao.label}>
                {cabecalhoDoGrupo}
                <li>
                <Link
                  to={secao.href}
                  aria-current={estaAtiva ? 'page' : undefined}
                  title={estreita ? secao.label : undefined}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-md py-2 text-body font-medium',
                    estreita ? 'justify-center px-0' : 'px-2.5',
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
                  <span className={cn('truncate', estreita && 'sr-only')}>{secao.label}</span>
                  {secao.badge && !estreita && (
                    <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-badge font-bold text-on-brand">
                      {secao.badge}
                    </span>
                  )}
                </Link>
                </li>
              </Fragment>
            );
          }

          return (
            <Fragment key={secao.label}>
              {cabecalhoDoGrupo}
              <li>
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
                title={estreita ? secao.label : undefined}
                className={cn(
                  'relative flex w-full items-center gap-2.5 rounded-md py-2 text-body font-medium',
                  estreita ? 'justify-center px-0' : 'px-2.5',
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
                <span className={cn('truncate', estreita && 'sr-only')}>{secao.label}</span>
                {!estreita && (
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
                <ul className={cn('mt-0.5 space-y-0.5', !estreita && 'ml-4 border-l border-border-token pl-2')}>
                  {secao.items.map((item) => {
                    const ItemIcone = item.icon;
                    const itemAtivo = ativo(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <ItemDeMenu
                          item={item}
                          ativo={itemAtivo}
                          Icone={ItemIcone}
                          rotuloOculto={estreita}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              </li>
            </Fragment>
          );
        })}
      </ul>
    </nav>
    </div>
  );
};

Sidebar.displayName = 'Sidebar';

export default Sidebar;
