import { FUSO_DE_NEGOCIO } from '../../utils/fusoDeNegocio';

/** Um turno não passa de um dia. Mais que isso, alguém esqueceu de fechar. */
export const LIMITE_DO_CAIXA_ABERTO_MS = 24 * 60 * 60 * 1000;

/**
 * "26/07" quando o caixa está aberto há mais de 24 h; `null` quando está no
 * prazo ou a data de abertura não é legível.
 *
 * Havia lojas com o caixa aberto há 60 dias — o "esperado em caixa" daquela
 * tela somava dois meses de sangria e reforço e não batia com gaveta nenhuma.
 */
export function caixaAbertoDesde(openedAt: string | null | undefined, agora = new Date()): string | null {
  if (!openedAt) return null;
  const aberto = new Date(openedAt);
  if (Number.isNaN(aberto.getTime())) return null;
  if (agora.getTime() - aberto.getTime() <= LIMITE_DO_CAIXA_ABERTO_MS) return null;
  return aberto.toLocaleDateString('pt-BR', { timeZone: FUSO_DE_NEGOCIO, day: '2-digit', month: '2-digit' });
}
