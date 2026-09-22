/**
 * Regras puras da Fila humana: como o tempo de espera aparece e quem já
 * passou do ponto de "resposta rápida" para "cliente abandonado".
 */
import type { ItemDaFilaHumana } from '../../services/conversations';

const UM_DIA = 24 * 60;

/** "5 min", "2h 10min", "3 dias". */
export function tempoDeEspera(minutos: number): string {
  if (minutos < 60) return `${Math.max(0, minutos)} min`;
  if (minutos < UM_DIA) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  const dias = Math.floor(minutos / UM_DIA);
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

/** Quem espera há menos de 1 dia (responder agora) × quem ficou sem resposta. */
export function separarPorEspera(esperando: ItemDaFilaHumana[]) {
  return {
    agora: esperando.filter((i) => i.minutos_esperando < UM_DIA),
    semResposta: esperando.filter((i) => i.minutos_esperando >= UM_DIA),
  };
}
