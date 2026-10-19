import React from 'react';

import { Input } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import type { Conta, ValoresEditaveis } from './contaDaNota';

interface Props {
  valores: ValoresEditaveis;
  onMudar: (valores: ValoresEditaveis) => void;
  conta: Conta;
  formaDePagamento: string;
}

const FORMAS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  card: 'Cartão',
  card_on_delivery: 'Cartão na entrega',
  link: 'Link de pagamento',
  voucher: 'Vale-refeição',
  voucher_link: 'Vale-refeição',
};

const Quadro: React.FC<{ rotulo: string; valor: number; destaque?: boolean }> = ({ rotulo, valor, destaque }) => (
  <div className={`superficie px-4 py-3 ${destaque ? 'border-brand' : ''}`}>
    <p className="text-caption uppercase text-fg-muted-token">{rotulo}</p>
    <p className={`text-lg font-semibold tabular-nums ${destaque ? 'text-brand-ink' : 'text-fg-token'}`}>
      {formatCurrency(valor)}
    </p>
  </div>
);

/**
 * Etapa Pagamento: a conta da nota e o que fecha com ela. O pagamento sai
 * sempre igual ao total — é o que a SEFAZ confere ("ausência de troco").
 */
export const PagamentoDaNota: React.FC<Props> = ({ valores, onMudar, conta, formaDePagamento }) => {
  const mudar = (campo: keyof ValoresEditaveis) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onMudar({ ...valores, [campo]: e.target.value });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Quadro rotulo="Itens" valor={conta.itens} />
        <Quadro rotulo="Frete" valor={conta.frete} />
        <Quadro rotulo="Desconto" valor={conta.desconto} />
        <Quadro rotulo="Total da nota" valor={conta.total} destaque />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input label="Frete" inputMode="decimal" value={valores.frete} onChange={mudar('frete')} />
        <Input label="Desconto" inputMode="decimal" value={valores.desconto} onChange={mudar('desconto')} />
        <Input label="Acréscimo" inputMode="decimal" value={valores.acrescimo} onChange={mudar('acrescimo')} />
      </div>

      <div className="superficie flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
        <span className="text-fg-muted-token">
          Pagamento · <span className="font-medium text-fg-token">{FORMAS[formaDePagamento] ?? 'Outros'}</span>
          {conta.taxaDoVale > 0 && ` · inclui ${formatCurrency(conta.taxaDoVale)} de taxa do vale`}
        </span>
        <span className="font-semibold tabular-nums text-fg-token">{formatCurrency(conta.total)}</span>
      </div>
    </div>
  );
};

export default PagamentoDaNota;
