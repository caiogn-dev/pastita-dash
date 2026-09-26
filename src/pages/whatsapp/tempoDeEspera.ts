/**
 * Há quanto tempo o cliente espera uma pessoa — e quando isso vira urgência.
 *
 * Régua do balcão: até 3 min é normal; passou de 3 pede atenção (amarelo);
 * passou de 10 o cliente está sendo perdido (vermelho). A mesma régua vale
 * para a Fila humana e para a faixa do inbox.
 */
import type { BadgeTone } from '../../components/ui/Badge';

const MINUTO = 60;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export const ATENCAO_APOS_SEGUNDOS = 3 * MINUTO;
export const URGENTE_APOS_SEGUNDOS = 10 * MINUTO;

/** "agora", "há 12 min", "há 2h 10min", "há 3 dias". */
export function haQuanto(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < MINUTO) return 'agora';
  if (segundos < HORA) return `há ${Math.floor(segundos / MINUTO)} min`;
  if (segundos < DIA) {
    const h = Math.floor(segundos / HORA);
    const m = Math.floor((segundos % HORA) / MINUTO);
    return m ? `há ${h}h ${m}min` : `há ${h}h`;
  }
  const dias = Math.floor(segundos / DIA);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

/** Tom do selo de espera: neutro até 3 min, amarelo até 10, vermelho depois. */
export function tomDaEspera(segundos: number): BadgeTone {
  if (segundos > URGENTE_APOS_SEGUNDOS) return 'danger';
  if (segundos > ATENCAO_APOS_SEGUNDOS) return 'warning';
  return 'neutral';
}

export interface EsperaDoItem {
  esperando_desde?: string | null;
  esperando_ha_segundos?: number | null;
  /** Campo antigo da fila, em minutos. */
  minutos_esperando?: number | null;
}

/**
 * Segundos de espera AGORA — o relógio anda entre uma busca e outra.
 * Preferência: a data de início (exata); senão o valor da resposta somado ao
 * tempo desde a busca; senão os minutos da resposta antiga.
 */
export function segundosDeEspera(item: EsperaDoItem, buscadoEm: number, agora: number): number {
  if (item.esperando_desde) {
    const inicio = Date.parse(item.esperando_desde);
    if (Number.isFinite(inicio)) return Math.max(0, Math.floor((agora - inicio) / 1000));
  }
  const base = typeof item.esperando_ha_segundos === 'number'
    ? item.esperando_ha_segundos
    : Math.max(0, item.minutos_esperando ?? 0) * 60;
  if (base <= 0) return 0;
  return base + Math.max(0, Math.floor((agora - buscadoEm) / 1000));
}
