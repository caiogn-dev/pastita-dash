/**
 * Abas de segmento da lista de clientes.
 *
 * A régua mora no servidor (`stats.segmentos.reguas`) e o filtro também
 * (`?segmento=`): aqui só se decide a ordem e o rótulo. A ordem vai do cliente
 * que mais vale ao que menos responde — VIP primeiro, lead por último.
 */
import type { PeriodOption } from '../../components/ui/PeriodChips';
import type { SegmentosDeClientes } from '../../services/storesApi';

export type Segmento = 'todos' | 'vip' | 'ativos' | 'em_risco' | 'inativos' | 'sem_compra';

const ROTULOS: Array<[Segmento, string]> = [
  ['todos', 'Todos'],
  ['vip', 'VIP'],
  ['ativos', 'Ativos'],
  ['em_risco', 'Em risco'],
  ['inativos', 'Inativos'],
  ['sem_compra', 'Nunca compraram'],
];

export function abasDeSegmento(seg: SegmentosDeClientes | null | undefined): PeriodOption<Segmento>[] {
  return ROTULOS.map(([value, label]) => {
    const n = value === 'todos' ? undefined : seg?.[value];
    // Sem número enquanto o stats não chega: zero leria como "ninguém".
    return { value, label, count: typeof n === 'number' ? n : undefined };
  });
}

export function regraDoSegmento(seg: SegmentosDeClientes | null | undefined, s: Segmento): string | null {
  if (s === 'todos') return null;
  return seg?.reguas?.[s] ?? null;
}

export function segmentoDaUrl(params: URLSearchParams): Segmento {
  const v = params.get('segmento');
  return ROTULOS.some(([s]) => s === v) ? (v as Segmento) : 'todos';
}
