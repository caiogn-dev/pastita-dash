/**
 * A lista ranqueada — o formato canônico de "pessoas ou coisas com um valor".
 *
 * Estava dentro de `pages/reports/sections/shared.tsx` e por isso não era
 * encontrada por quem construía fora de relatórios: a página de indicações
 * nasceu com uma lista escrita à mão que fazia a mesma coisa pior, e o dono
 * cobrou — "você está criando vários blocos ao invés de reutilizar o que já
 * existe".
 *
 * Mora aqui agora. Relatórios continuam importando do mesmo lugar de sempre
 * (`shared.tsx` reexporta), então nada quebrou para mudar de casa.
 */
import React from 'react';
import { Link } from 'react-router-dom';

export const EmptyNote: React.FC<{ text?: string }> = ({ text = 'Sem dados no período.' }) => (
  <p className="text-sm text-fg-muted-token py-4">{text}</p>
);

export interface RankedItem {
  label: string;
  /** linha secundária sob o rótulo (ex.: cidade, qtd vendida). */
  sub?: string;
  /** magnitude que dimensiona a barra. */
  value: number;
  /** texto exibido à direita (default: value formatado pt-BR). */
  valueLabel?: string;
  /** chip opcional ao lado do rótulo (ex.: classe ABC). */
  badge?: React.ReactNode;
  /** ações à direita (links/botões). */
  actions?: React.ReactNode;
  /**
   * Para onde a linha leva, quando existe destino.
   *
   * Só o RÓTULO vira link — não a linha inteira. A linha carrega badge, barra
   * e valor; envolver tudo num `<a>` faria o leitor de tela anunciar o card
   * inteiro como um nome de link e engoliria os elementos interativos que já
   * moram em `actions`.
   *
   * Ranking sem destino (produto, bairro) continua texto: virar link
   * prometeria uma ficha que não existe.
   */
  href?: string;
  /** barra em tom de alerta (ex.: nota baixa). */
  danger?: boolean;
}

const MEDAL_STYLES = [
  'bg-[color-mix(in_srgb,var(--brand)_85%,#fff)] text-black',            // ouro
  'bg-[color-mix(in_srgb,#c0c0c0_80%,transparent)] text-black',          // prata
  'bg-[color-mix(in_srgb,#cd7f32_70%,transparent)] text-white',          // bronze
];

/**
 * Lista ranqueada — o formato canônico dos rankings de relatório: medalha
 * nos 3 primeiros, barra proporcional dourada e valor à direita. Substitui
 * as tabelas nos rankings (tabela fica só para dados de conferência, ex.
 * fechamento de caixa).
 */
export const RankedList: React.FC<{
  items: RankedItem[];
  /** escala máxima da barra (default: maior value da lista). */
  max?: number;
  medals?: boolean;
}> = ({ items, max, medals = true }) => {
  if (!items.length) return <EmptyNote />;
  const peak = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-1">
      {items.map((item, idx) => {
        const pct = Math.max(3, Math.round((item.value / peak) * 100));
        return (
          <div
            key={`${item.label}-${idx}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2 transition-colors"
          >
            <span
              className={`shrink-0 w-7 h-7 rounded-full grid place-items-center text-xs font-bold tabular-nums ${
                medals && idx < 3 ? MEDAL_STYLES[idx] : 'bg-surface-2 text-fg-muted-token'
              }`}
            >
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {item.href ? (
                  <Link
                    to={item.href}
                    className="truncate text-sm font-medium text-fg-token hover:text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
                    title={item.label}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium text-fg-token" title={item.label}>
                    {item.label}
                  </span>
                )}
                {item.badge}
              </div>
              {item.sub && <p className="text-xs text-fg-muted-token truncate">{item.sub}</p>}
              <div className="mt-1.5 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: item.danger
                      ? '#dc2626'
                      : 'linear-gradient(90deg, color-mix(in srgb, var(--brand) 55%, transparent), var(--brand))',
                  }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-sm font-semibold text-fg-token tabular-nums">
                {item.valueLabel ?? new Intl.NumberFormat('pt-BR').format(item.value)}
              </span>
              {item.actions}
            </div>
          </div>
        );
      })}
    </div>
  );
};

