/**
 * A comanda: o que já foi bipado, agrupado por loja.
 *
 * Saiu da `PdvBalcaoPage` porque é a parte que o operador OLHA — enquanto o
 * resto da tela é o que ele aciona. Misturada no meio de scanner, cliente,
 * pagamento e três modais, ela competia por atenção com tudo; e a página, com
 * 735 linhas, obrigava a ler a venda inteira para mexer numa linha de item.
 *
 * O balcão vende itens de mais de uma loja na mesma comanda (cada uma vira um
 * pedido próprio no fim). Por isso a lista é agrupada — mas o cabeçalho do
 * grupo só aparece com duas ou mais: com uma loja só, seria uma faixa
 * repetindo o óbvio em cima de cada venda.
 */
import React from 'react';
import {
  BuildingStorefrontIcon,
  MinusIcon,
  PlusIcon,
  QrCodeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import { Button } from '../../components/ui';

export interface ItemDaComanda {
  product: { id: string; name: string; price: number | string };
  quantity: number;
}

export interface GrupoDaComanda {
  storeSlug: string;
  storeName: string;
  items: ItemDaComanda[];
}

export interface ComandaDoBalcaoProps {
  grupos: GrupoDaComanda[];
  vazia: boolean;
  onAlterarQuantidade: (produtoId: string, delta: number) => void;
  onRemover: (produtoId: string) => void;
  formatarValor: (valor: number) => string;
}

export const ComandaDoBalcao: React.FC<ComandaDoBalcaoProps> = ({
  grupos,
  vazia,
  onAlterarQuantidade,
  onRemover,
  formatarValor,
}) => {
  if (vazia) {
    return (
      <div className="py-14 text-center text-fg-muted-token">
        <QrCodeIcon className="mx-auto mb-3 h-12 w-12" />
        Comanda vazia — bipe o primeiro produto.
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="pdv-comanda">
      {grupos.map((g) => (
        <div key={g.storeSlug}>
          {grupos.length > 1 && (
            <div className="mb-1 flex items-center justify-between gap-2 border-b border-border-token pb-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-fg-token">
                <BuildingStorefrontIcon className="h-4 w-4" /> {g.storeName}
              </div>
              <div className="text-sm text-fg-muted-token">
                {formatarValor(
                  g.items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0),
                )}
              </div>
            </div>
          )}

          <ul className="divide-y divide-[color:var(--border)]">
            {g.items.map((i) => (
              <li key={i.product.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-fg-token">{i.product.name}</div>
                  <div className="text-sm text-fg-muted-token">
                    {formatarValor(Number(i.product.price))} un.
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Diminuir ${i.product.name}`}
                    onClick={() => onAlterarQuantidade(i.product.id, -1)}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold tabular-nums">{i.quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Aumentar ${i.product.name}`}
                    onClick={() => onAlterarQuantidade(i.product.id, 1)}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>

                <div className="w-24 text-right font-semibold tabular-nums">
                  {formatarValor(Number(i.product.price) * i.quantity)}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover ${i.product.name}`}
                  onClick={() => onRemover(i.product.id)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ComandaDoBalcao;
