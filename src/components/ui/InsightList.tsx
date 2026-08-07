/**
 * InsightList — onde o painel para de reportar e começa a opinar.
 *
 * Um número sozinho não gera ação. "4 cupons expirando em breve" é ruído até
 * virar "4 cupons expirando · priorize extensão ou republicação". As quatro
 * partes são fixas:
 *
 *   DIREÇÃO      subiu / caiu / estável
 *   AFIRMAÇÃO    o que está acontecendo, em português
 *   VALOR        o número, destacado
 *   RECOMENDAÇÃO o que fazer a respeito
 *
 * A direção NÃO pode viver só na cor. Cerca de 8% dos homens não distinguem
 * verde de vermelho, e leitor de tela não lê cor nenhuma — por isso a seta é
 * `aria-hidden` e o significado vai num rótulo textual ("em alta", "em queda").
 *
 * Dois tons: `neutro` para destaques e `alerta` para o que precisa de atenção.
 * Mesma estrutura nos dois — o tom muda a moldura, não o contrato.
 */
import React from 'react';

import { cn } from '../../utils/cn';

export type InsightDirecao = 'alta' | 'baixa' | 'estavel';

export interface InsightItem {
  direcao: InsightDirecao;
  /** A afirmação. Ex.: "Melhor cupom: GRUPOVIP". */
  titulo: string;
  /** O número em destaque. Ex.: "4 pedidos no período". */
  valor?: string;
  /** O que fazer. Ex.: "duplicar campanha com novo período". */
  recomendacao?: string;
  /**
   * Para onde ir.
   *
   * Diagnóstico que termina em texto morre ali: "4 cupons expirando" obriga o
   * operador a lembrar onde ficam os cupons, sair da tela e achar os quatro.
   * Com o botão, o insight É a navegação.
   */
  acao?: { rotulo: string; onClick: () => void };
}

export interface InsightListProps {
  titulo: string;
  /** Contexto da comparação. Ex.: "Hoje · comparado a ontem". */
  descricao?: string;
  itens: InsightItem[];
  tom?: 'neutro' | 'alerta';
  className?: string;
}

const SETA: Record<InsightDirecao, string> = { alta: '▲', baixa: '▼', estavel: '—' };
const ROTULO: Record<InsightDirecao, string> = {
  alta: 'em alta',
  baixa: 'em queda',
  estavel: 'estável',
};
const COR_SETA: Record<InsightDirecao, string> = {
  alta: 'text-[var(--success)]',
  baixa: 'text-[var(--danger)]',
  estavel: 'text-fg-muted-token',
};

export const InsightList: React.FC<InsightListProps> = ({
  titulo,
  descricao,
  itens,
  tom = 'neutro',
  className,
}) => {
  // Cabeçalho "Alertas" pairando sobre o nada é pior que a ausência da seção.
  if (!itens.length) return null;

  const alerta = tom === 'alerta';

  return (
    <section
      aria-label={titulo}
      className={cn(
        'overflow-hidden rounded border',
        alerta
          ? 'border-[var(--warning)]/40 bg-[var(--warning)]/5'
          : 'border-border-token bg-surface',
        className
      )}
    >
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-3">
        <h2
          className={cn(
            'text-sm font-bold',
            alerta ? 'text-[var(--warning)]' : 'text-fg-token'
          )}
        >
          {titulo}
        </h2>
        {descricao && <p className="text-caption text-fg-muted-token">{descricao}</p>}
      </header>

      <ul className="divide-y divide-border-token border-t border-border-token">
        {itens.map((item, i) => (
          <li
            key={`${item.titulo}-${i}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
          >
            <span className={cn('text-sm font-bold', COR_SETA[item.direcao])} aria-hidden>
              {SETA[item.direcao]}
            </span>
            {/* sr-only: o sentido da seta precisa existir fora da cor e do glifo. */}
            <span className="sr-only">{ROTULO[item.direcao]}</span>

            <span className="min-w-0 flex-1 text-body text-fg-token">{item.titulo}</span>

            {item.valor && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-badge font-bold tabular-nums text-fg-token">
                {item.valor}
              </span>
            )}
            {item.recomendacao && (
              <span className="text-caption text-fg-muted-token">{item.recomendacao}</span>
            )}
            {item.acao && (
              <button
                type="button"
                onClick={item.acao.onClick}
                className="rounded px-2 py-1 text-caption font-semibold text-brand-ink underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {item.acao.rotulo} →
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

InsightList.displayName = 'InsightList';

export default InsightList;
