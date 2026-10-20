/**
 * PageTabs — corta uma página vertical longa em seções nomeadas.
 *
 * Configurações da Loja tinha sete cartões empilhados em 760 linhas: dados,
 * localização, entrega, horários, Meta Pixel, Clarity, avaliações do Google.
 * Nenhum é errado sozinho; o problema é o conjunto. Para mexer no horário de
 * sábado você rolava por Pixel e Clarity e atravessava seis campos que não
 * queria tocar — e o risco de mexer no errado é proporcional a quantos campos
 * você atravessa.
 *
 * Abas não são enfeite: elas dão NOME às partes. "Onde configuro o pixel?"
 * passa a ter resposta antes de rolar.
 *
 * TRÊS DECISÕES:
 *
 * 1. A aba ativa vive na URL (`?aba=`). Salvar recarrega a página em vários
 *    fluxos; sem isso você volta para a primeira aba e perde o lugar. E dá
 *    para mandar "está em Rastreamento" como link.
 *
 * 2. Aba desconhecida na URL cai na primeira. Link antigo com aba renomeada
 *    não pode virar tela branca.
 *
 * 3. Só a aba ativa é alcançável por Tab; as outras, pelas setas. É o padrão
 *    de tablist: sem isso, chegar ao conteúdo custa um Tab por aba.
 *
 * O conteúdo vem como função da aba ativa para que o consumidor monte apenas
 * o painel visível — sete seções montadas de uma vez é o custo que estamos
 * justamente tentando evitar.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { cn } from '../../utils/cn';

export interface PageTab {
  id: string;
  rotulo: string;
  icone?: React.ComponentType<{ className?: string }>;
  /** Marca a aba com um ponto de atenção (ex.: seção com erro ou pendência). */
  alerta?: boolean;
  /** Seção com alteração ainda não salva (ponto da marca, como no Propriedade). */
  mudou?: boolean;
}

export interface PageTabsProps {
  abas: PageTab[];
  children: (abaAtiva: string) => React.ReactNode;
  ariaLabel: string;
  /** Nome do parâmetro na URL. Trocar só se a página já usar `aba`. */
  parametro?: string;
  /**
   * Menu à esquerda (molde Configurações): no computador as seções viram uma
   * coluna e o conteúdo fica ao lado; no celular volta a ser a faixa no topo.
   * Sete abas numa linha só já passavam da largura e escondiam as últimas.
   */
  lateral?: boolean;
  className?: string;
}

export const PageTabs: React.FC<PageTabsProps> = ({
  abas,
  children,
  ariaLabel,
  parametro = 'aba',
  lateral = false,
  className,
}) => {
  const [params, setParams] = useSearchParams();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const ativa = useMemo(() => {
    const daUrl = params.get(parametro);
    return abas.some((a) => a.id === daUrl) ? (daUrl as string) : abas[0]?.id;
  }, [params, parametro, abas]);

  const ir = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set(parametro, id);
      // `replace`: trocar de aba não é navegação, é olhar outra parte da mesma
      // página. Empilhar no histórico faria o Voltar do navegador percorrer
      // abas em vez de sair da tela.
      setParams(next, { replace: true });
      // Foco acompanha a seleção, senão o teclado seleciona a aba e o foco
      // fica para trás.
      requestAnimationFrame(() => refs.current[id]?.focus());
    },
    [params, parametro, setParams]
  );

  const aoTeclar = (e: React.KeyboardEvent) => {
    const i = abas.findIndex((a) => a.id === ativa);
    if (e.key === 'ArrowRight' || (lateral && e.key === 'ArrowDown')) {
      e.preventDefault();
      ir(abas[(i + 1) % abas.length].id);
    } else if (e.key === 'ArrowLeft' || (lateral && e.key === 'ArrowUp')) {
      e.preventDefault();
      ir(abas[(i - 1 + abas.length) % abas.length].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      ir(abas[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      ir(abas[abas.length - 1].id);
    }
  };

  if (!abas.length) return null;

  return (
    <div className={cn('flex flex-col gap-5', lateral && 'lg:flex-row lg:items-start lg:gap-8', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation={lateral ? 'vertical' : undefined}
        onKeyDown={aoTeclar}
        className={cn(
          'flex gap-1 overflow-x-auto border-b border-border-token',
          lateral && 'lg:sticky lg:top-4 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible lg:border-b-0'
        )}
      >
        {abas.map((aba) => {
          const Icone = aba.icone;
          const selecionada = aba.id === ativa;
          return (
            <button
              key={aba.id}
              ref={(el) => { refs.current[aba.id] = el; }}
              type="button"
              role="tab"
              id={`aba-${aba.id}`}
              aria-selected={selecionada}
              aria-controls={`painel-${aba.id}`}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => ir(aba.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5',
                'text-body font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
                lateral && 'lg:rounded lg:border-b-0 lg:px-3 lg:py-2',
                selecionada
                  ? cn('border-brand text-brand-ink', lateral && 'lg:bg-brand-soft')
                  : cn('border-transparent text-fg-muted-token hover:text-fg-token', lateral && 'lg:hover:bg-surface-2')
              )}
            >
              {Icone && <Icone className="h-4 w-4 shrink-0" />}
              {aba.rotulo}
              {aba.mudou && (
                <>
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-ink" />
                  <span className="sr-only">(alterado, não salvo)</span>
                </>
              )}
              {aba.alerta && (
                <>
                  {/* Cor sozinha não é sinal: o texto diz o mesmo. */}
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
                  <span className="sr-only">(requer atenção)</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`painel-${ativa}`}
        aria-labelledby={`aba-${ativa}`}
        tabIndex={0}
        className={cn('focus-visible:outline-none', lateral && 'min-w-0 lg:flex-1')}
      >
        {children(ativa)}
      </div>
    </div>
  );
};

PageTabs.displayName = 'PageTabs';

export default PageTabs;
