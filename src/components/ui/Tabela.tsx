import React from 'react';

import { cn } from '../../utils/cn';
import { EmptyState } from './EmptyState';
import { Paginacao, PaginacaoProps } from './Paginacao';
import { linhaClicavel } from './RowActions';
import { TableSkeleton } from './skeleton';

export interface ColunaDaTabela<T> {
  chave: string;
  cabecalho: string;
  render: (item: T) => React.ReactNode;
  /** Alinhamento do conteúdo. Números pedem `direita`. */
  alinhamento?: 'esquerda' | 'direita' | 'centro';
  /** Não entra no cartão do celular — coluna de contexto, não de decisão. */
  soNoDesktop?: boolean;
  /**
   * Classes aplicadas ao `th` E ao `td` da coluna. É onde mora a largura e o
   * corte por faixa intermediária (`max-lg:hidden`): o cartão resolve o
   * celular, mas entre o celular e o monitor ainda há tablet.
   */
  classe?: string;
}

export interface TabelaProps<T> {
  itens: T[];
  colunas: ColunaDaTabela<T>[];
  chave: (item: T) => string;
  /** O que o leitor de tela anuncia na linha. Também é o nome da linha. */
  rotuloDaLinha: (item: T) => string;
  /** Presente = a linha inteira abre o item. Ausente = a linha é só leitura. */
  onAbrir?: (item: T) => void;
  carregando?: boolean;
  vazio?: { titulo: string; descricao?: string; icone?: React.ReactNode; acao?: React.ReactNode };
  paginacao?: Omit<PaginacaoProps, 'className'>;
  className?: string;
}

const ALINHA = {
  esquerda: 'text-left',
  direita: 'text-right',
  centro: 'text-center',
} as const;

/**
 * A tabela do painel.
 *
 * No desktop é uma `<table>`; no celular são cartões montados da MESMA
 * definição de coluna. Era essa a falta que levava cada página a escrever a
 * lista duas vezes — e as duas versões sempre acabavam divergindo.
 */
export function Tabela<T>({
  itens,
  colunas,
  chave,
  rotuloDaLinha,
  onAbrir,
  carregando = false,
  vazio,
  paginacao,
  className,
}: TabelaProps<T>) {
  if (carregando && itens.length === 0) {
    return <TableSkeleton rows={5} columns={colunas.length} />;
  }

  // Vazio só quando a resposta já chegou: piscar "nenhum resultado" durante o
  // carregamento faz o operador acreditar que a loja não tem o dado.
  if (itens.length === 0) {
    return vazio ? (
      <EmptyState
        titulo={vazio.titulo}
        descricao={vazio.descricao}
        icone={vazio.icone}
        acao={vazio.acao}
      />
    ) : null;
  }

  const noCartao = colunas.filter((c) => !c.soNoDesktop);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* ── Celular: cartões ── */}
      <div data-testid="tabela-cartoes" className="flex flex-col gap-3 md:hidden">
        {itens.map((item) => {
          const abrir = onAbrir ? linhaClicavel(() => onAbrir(item), rotuloDaLinha(item)) : {};
          return (
            <div
              key={chave(item)}
              {...abrir}
              className={cn(
                'rounded-xl border border-border-token bg-surface p-4',
                onAbrir && (abrir as { className?: string }).className,
              )}
            >
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                {noCartao.map((coluna) => (
                  <div key={coluna.chave} className="min-w-0">
                    <dt className="text-xs text-fg-muted-token">{coluna.cabecalho}</dt>
                    <dd className="mt-0.5 truncate text-sm text-fg-token">{coluna.render(item)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>

      {/* ── Desktop: tabela ── */}
      <div className="max-md:hidden overflow-x-auto rounded-xl border border-border-token">
        <table className="w-full">
          <thead className="border-b border-border-token bg-surface-2">
            <tr>
              {colunas.map((coluna) => (
                <th
                  key={coluna.chave}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-fg-muted-token',
                    ALINHA[coluna.alinhamento ?? 'esquerda'],
                    coluna.classe,
                  )}
                >
                  {coluna.cabecalho}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-token bg-surface">
            {itens.map((item) => (
              <tr
                key={chave(item)}
                {...(onAbrir
                  ? linhaClicavel(() => onAbrir(item), rotuloDaLinha(item))
                  : { 'aria-label': rotuloDaLinha(item) })}
              >
                {colunas.map((coluna) => (
                  <td
                    key={coluna.chave}
                    className={cn(
                      'px-4 py-3 text-sm text-fg-token',
                      ALINHA[coluna.alinhamento ?? 'esquerda'],
                      coluna.classe,
                    )}
                  >
                    {coluna.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginacao && <Paginacao {...paginacao} />}
    </div>
  );
}

Tabela.displayName = 'Tabela';
