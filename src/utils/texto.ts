/**
 * Conta de texto que o painel inteiro faz (26/10). Tirar acento e montar slug
 * estavam escritos em 14 arquivos, cada um com a sua variação de ordem e de
 * fim de string.
 */

/** "Ação" → "Acao". Mantém a caixa. */
export const semAcento = (s: string): string => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Chave de comparação de busca: sem acento e minúsculo. */
export const paraBusca = (s: string): string => semAcento(s).toLowerCase();

/** "Salada Caesar (Grande)" → "salada-caesar-grande". */
export function slugify(s: string, { max, reserva = '' }: { max?: number; reserva?: string } = {}): string {
  let slug = paraBusca(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (max) slug = slug.slice(0, max).replace(/-+$/, '');
  return slug || reserva;
}
