/**
 * Aviso opt-in da Fila humana, em `store.metadata.aviso_fila_humana`:
 * `{ativo, apos_minutos, telefone}`. Nasce desligado.
 */
/** Chave em `store.metadata` — o backend lê a mesma para mandar o aviso. */
export const CHAVE_AVISO_FILA_HUMANA = 'aviso_fila_humana';

export interface AvisoFilaHumana {
  ativo: boolean;
  apos_minutos: number;
  telefone: string;
}

const PADRAO: AvisoFilaHumana = { ativo: false, apos_minutos: 10, telefone: '' };

/** O que está gravado, com o padrão (desligado, 10 min) no que faltar. */
export function lerAvisoFilaHumana(metadata?: Record<string, unknown> | null): AvisoFilaHumana {
  const bruto = (metadata?.[CHAVE_AVISO_FILA_HUMANA] ?? {}) as Partial<AvisoFilaHumana>;
  const minutos = Number(bruto.apos_minutos);
  return {
    ativo: bruto.ativo === true,
    apos_minutos: Number.isFinite(minutos) && minutos > 0 ? minutos : PADRAO.apos_minutos,
    telefone: typeof bruto.telefone === 'string' ? bruto.telefone : '',
  };
}
