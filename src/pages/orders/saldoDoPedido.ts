/**
 * Quanto entrou, quanto falta — e se o pedido foi pago A MENOR.
 *
 * A trava do backend está certa: PIX de R$ 38,95 num pedido de R$ 43,28 não
 * quita o pedido. O defeito era ser mudo — o pedido só parava em
 * "processando" e ninguém sabia que faltavam R$ 4,33 (Leani, 03/09).
 *
 * `amount_paid` é o que passou por cobrança; `amount_due` já respeita o rótulo
 * `paid` do pagamento em dinheiro (ver `StoreOrder.amount_due`). Esta função só
 * lê os dois — não recalcula regra de dinheiro no navegador.
 */
import { formatCurrency } from '../../utils/formatters';

interface PedidoComSaldo {
  status?: string | null;
  total?: number | string | null;
  amount_paid?: number | string | null;
  amount_due?: number | string | null;
}

export interface SaldoDoPedido {
  pago: number;
  total: number;
  falta: number;
  /** Entrou dinheiro, mas não o total. */
  aMenor: boolean;
  /** "Pago R$ 38,95 de R$ 43,28 — falta R$ 4,33" (vazio quando não é a menor). */
  texto: string;
}

const ENCERRADOS = new Set(['cancelled', 'refunded', 'failed']);

const numero = (v: number | string | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function saldoDoPedido(pedido: PedidoComSaldo): SaldoDoPedido {
  const pago = numero(pedido.amount_paid);
  const total = numero(pedido.total);
  const falta = numero(pedido.amount_due);
  const aMenor = pago > 0 && falta > 0 && !ENCERRADOS.has(pedido.status ?? '');
  return {
    pago,
    total,
    falta,
    aMenor,
    texto: aMenor
      ? `Pago ${formatCurrency(pago)} de ${formatCurrency(total)} — falta ${formatCurrency(falta)}`
      : '',
  };
}

/** Pode registrar pagamento: há saldo e o pedido não foi encerrado. */
export function podeRegistrarPagamento(pedido: PedidoComSaldo): boolean {
  if (pedido.amount_due === undefined || pedido.amount_due === null) return false;
  return numero(pedido.amount_due) > 0 && !ENCERRADOS.has(pedido.status ?? '');
}

/**
 * Formas aceitas pelo `registrar-pagamento`. Slugs canônicos do backend — o
 * campo `payment_method` já teve 6 dialetos; não inventar o sétimo.
 */
export const FORMAS_DE_REGISTRO: { valor: string; rotulo: string }[] = [
  { valor: 'cash', rotulo: 'Dinheiro' },
  { valor: 'debit_card', rotulo: 'Débito (maquininha)' },
  { valor: 'credit_card', rotulo: 'Crédito (maquininha)' },
  { valor: 'pix', rotulo: 'PIX direto' },
  { valor: 'voucher', rotulo: 'Vale-refeição' },
  { valor: 'other', rotulo: 'Outro' },
];
