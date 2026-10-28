/**
 * Como paga, em três grupos que dizem quando o dinheiro entra: agora (PIX,
 * a cobrança sai junto), na entrega (dinheiro com troco, maquininha, vale com
 * a bandeira) ou depois (fiado — a receber, não entra no caixa ao entregar).
 */
import React from 'react';
import { CampoDeDinheiro } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { formatCurrency } from '../../../utils/formatters';
import { BANDEIRAS_DE_VALE, PAYMENT_LABELS, type PaymentMethod } from '../../../components/orders/newOrder/types';
import type { NewOrderWizard } from '../../../components/orders/newOrder/useNewOrderWizard';

const GRUPOS: { titulo: string; formas: PaymentMethod[] }[] = [
  { titulo: 'Agora', formas: ['pix'] },
  { titulo: 'Na entrega', formas: ['cash', 'card_on_delivery', 'voucher_on_delivery'] },
  { titulo: 'Depois', formas: ['fiado'] },
];

const NOME_CURTO: Partial<Record<PaymentMethod, string>> = {
  pix: 'PIX',
  card_on_delivery: 'Maquininha',
  voucher_on_delivery: 'Vale',
};

function Opcao({ ativo, onClick, children, rotulo }: {
  ativo: boolean; onClick: () => void; children: React.ReactNode; rotulo?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      aria-label={rotulo}
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
        ativo ? 'border-brand bg-brand-soft text-brand-ink' : 'border-border-token text-fg-token hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  );
}

export function PagamentoDoPedido({ wiz, total }: { wiz: NewOrderWizard; total: number }) {
  const troco = wiz.trocoPara != null && wiz.trocoPara > total ? wiz.trocoPara - total : null;
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Forma de pagamento" className="space-y-2">
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
            <span className="text-xs text-fg-muted-token">{g.titulo}</span>
            <div className="flex flex-wrap gap-1.5">
              {g.formas.map((f) => (
                <Opcao
                  key={f}
                  ativo={wiz.paymentMethod === f}
                  rotulo={PAYMENT_LABELS[f]}
                  onClick={() => wiz.setPaymentMethod(f)}
                >
                  {NOME_CURTO[f] ?? PAYMENT_LABELS[f]}
                </Opcao>
              ))}
            </div>
          </div>
        ))}
      </div>

      {wiz.paymentMethod === 'cash' && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <CampoDeDinheiro rotulo="Troco para" valor={wiz.trocoPara} onMudar={wiz.setTrocoPara} />
          <span className="pb-2 text-sm text-fg-muted-token tabular-nums" data-testid="troco-a-levar">
            {troco != null ? `Levar ${formatCurrency(troco)}` : 'Sem troco'}
          </span>
        </div>
      )}

      {wiz.paymentMethod === 'voucher_on_delivery' && (
        <div role="radiogroup" aria-label="Bandeira do vale" className="flex flex-wrap gap-1.5">
          {BANDEIRAS_DE_VALE.map((b) => (
            <Opcao key={b.valor} ativo={wiz.bandeiraDoVale === b.valor} onClick={() => wiz.setBandeiraDoVale(b.valor)}>
              {b.rotulo}
            </Opcao>
          ))}
        </div>
      )}
    </div>
  );
}
