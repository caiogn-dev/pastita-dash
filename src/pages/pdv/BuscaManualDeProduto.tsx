/**
 * Adicionar produto sem bipar.
 *
 * O balcão é feito para o leitor de código, mas leitor falha, código descola e
 * produto a granel não tem etiqueta. Esta busca é a saída de emergência que
 * evita o operador travar na frente do cliente — por isso o texto do campo diz
 * "adicionar sem bipar", nomeando a situação em vez de dizer só "buscar".
 *
 * Saiu da `PdvBalcaoPage` junto com a comanda e o cliente.
 */
import React from 'react';

import { SearchInput } from '../../components/ui';
import { precoVigenteDoProduto } from '../../utils/precoVigente';

/**
 * Só o que ESTE componente lê. Genérico no item para que a página passe o
 * próprio `CatalogEntry` (que tem mais campos) e o callback continue recebendo
 * o tipo dela — sem o genérico o `onEscolher` fica contravariante e o
 * TypeScript recusa, com razão: o componente devolveria menos do que a página
 * espera.
 */
export interface CandidatoDeProduto {
  product: { id: string; name: string; price: number | string; preco_vigente?: number | string | null };
  storeName: string;
}

export interface BuscaManualDeProdutoProps<T extends CandidatoDeProduto> {
  valor: string;
  onBuscar: (valor: string) => void;
  candidatos: T[];
  onEscolher: (candidato: T) => void;
  /** Abaixo de 2 lojas o nome da loja é ruído em toda linha. */
  totalDeLojas: number;
  formatarValor: (valor: number) => string;
}

export function BuscaManualDeProduto<T extends CandidatoDeProduto>({
  valor,
  onBuscar,
  candidatos,
  onEscolher,
  totalDeLojas,
  formatarValor,
}: BuscaManualDeProdutoProps<T>) {
  return (
  <div className="relative mb-3">
    <SearchInput
      placeholder="Adicionar sem bipar — busque o produto por nome…"
      value={valor}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onBuscar(e.target.value)}
      data-testid="pdv-busca-manual"
    />

    {candidatos.length > 0 && (
      <ul className="absolute left-0 right-0 z-10 mt-1 max-h-64 divide-y divide-[color:var(--border)] overflow-y-auto rounded border border-border-token bg-surface shadow-lg">
        {candidatos.map((c) => (
          <li key={c.product.id}>
            <button
              type="button"
              onClick={() => onEscolher(c)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg-token">{c.product.name}</span>
                {totalDeLojas > 1 && (
                  <span className="block text-xs text-fg-muted-token">{c.storeName}</span>
                )}
              </span>
              <span className="shrink-0 text-sm text-fg-muted-token">
                {formatarValor(precoVigenteDoProduto(c.product))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
    </div>
  );
}

export default BuscaManualDeProduto;
