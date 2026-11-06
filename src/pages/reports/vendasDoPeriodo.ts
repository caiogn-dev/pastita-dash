/**
 * Cards de Relatórios › Vendas a partir de UM bloco do backend
 * (`reports/revenue/` → `vendas`), na mesma janela do filtro.
 *
 * Antes "Pedidos no período", "Cancelados", "Pedidos por dia" e "Distribuição
 * por status" liam `core/dashboard/charts/?days=1`, que ignora o período: com
 * "Ontem" mostrava pedidos de hoje e cancelados desde sempre ("7100,0%").
 */
import type { VendasDoPeriodo } from '../../services/reports';

const STATUS_NEGATIVOS = new Set(['cancelled', 'refunded', 'failed']);

export interface CardsDeVendas {
  pedidos: number;
  pagos: number;
  cancelados: number;
  canceladosPct: number;
  faturamento: number;
  frete: number;
  ticketMedio: number | null;
  porDia: number;
  serie: { date: string; count: number }[];
  status: { status: string; value: number; danger: boolean }[];
}

const num = (v: string | number | null | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function cardsDeVendas(v: VendasDoPeriodo | undefined | null): CardsDeVendas {
  const pedidos = num(v?.pedidos);
  const cancelados = num(v?.cancelados);
  const serie = (v?.por_dia ?? []).map((d) => ({ date: d.date, count: num(d.pedidos) }));
  // Recalcula aqui também: a razão é sempre sobre os pedidos do MESMO período.
  const canceladosPct = pedidos > 0 ? Math.min(100, Math.round((cancelados / pedidos) * 1000) / 10) : 0;

  return {
    pedidos,
    pagos: num(v?.pagos),
    cancelados,
    canceladosPct,
    faturamento: num(v?.faturamento),
    frete: num(v?.frete),
    ticketMedio: v?.ticket_medio != null ? num(v.ticket_medio) : null,
    porDia: serie.length > 0 ? pedidos / serie.length : 0,
    serie,
    status: Object.entries(v?.por_status ?? {})
      .map(([status, n]) => ({ status, value: num(n), danger: STATUS_NEGATIVOS.has(status) }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value),
  };
}
