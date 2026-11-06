/**
 * Duração legível para a operação (cozinha, relatórios de tempo).
 *
 * Até 60 min: "45min". Acima: "2h 5min". Acima de 24 h: "42 d" — um pedido
 * esquecido aberto aparecia na cozinha como "60716min".
 */
const UM_DIA = 24 * 60;

export function formatarDuracao(minutos: number | null | undefined): string {
  if (minutos == null || Number.isNaN(minutos)) return '—';
  const total = Math.max(0, Math.round(minutos));
  if (total <= 60) return `${total}min`;
  if (total <= UM_DIA) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${Math.floor(total / UM_DIA)} d`;
}
