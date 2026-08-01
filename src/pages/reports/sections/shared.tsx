/** Utilitários compartilhados das seções de analytics (BI Fase 1). */
import React from 'react';
import { Card } from '../../../components/ui';

export const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const Spinner: React.FC = () => (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
  </div>
);

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  loading?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, loading, children }) => (
  <Card className="p-4">
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-fg-token">{title}</h2>
      {subtitle && <p className="text-sm text-fg-muted-token mt-0.5">{subtitle}</p>}
    </div>
    {loading ? <Spinner /> : children}
  </Card>
);

export const EmptyNote: React.FC<{ text?: string }> = ({ text = 'Sem dados no período.' }) => (
  <p className="text-sm text-fg-muted-token py-4">{text}</p>
);

/** Tabela simples padrão das seções (headers à esquerda, números à direita). */
export const MiniTable: React.FC<{
  headers: Array<{ label: string; align?: 'left' | 'right' }>;
  rows: Array<Array<React.ReactNode>>;
}> = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-token">
          {headers.map((h) => (
            <th
              key={h.label}
              className={`pb-2 font-medium text-fg-muted-token ${h.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className="border-b border-border-token/50 last:border-0">
            {cells.map((cell, j) => (
              <td
                key={j}
                className={`py-2 text-fg-token ${headers[j]?.align === 'right' ? 'text-right tabular-nums' : ''}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
