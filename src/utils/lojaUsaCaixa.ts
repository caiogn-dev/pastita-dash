/**
 * "Uso caixa com dinheiro vivo" — preferência da loja, guardada em
 * `store.metadata` pelo mesmo PATCH da loja que as outras preferências usam.
 *
 * Existe porque lojas que só recebem PIX e cartão tinham sessões de caixa
 * abertas havia 60 dias: a tela ficava no menu, alguém abria "para ver", e
 * ninguém fechava. Quem não tem gaveta não precisa da tela.
 *
 * Falha ABERTO: loja não carregada, metadata ausente ou chave nunca gravada
 * mostram o Caixa. Só `false` explícito esconde — erro de leitura não pode
 * apagar uma tela em silêncio.
 */
export const CHAVE_USA_CAIXA = 'usa_caixa_dinheiro';

export function lojaUsaCaixa(
  loja: { metadata?: Record<string, unknown> | null } | null | undefined,
): boolean {
  return loja?.metadata?.[CHAVE_USA_CAIXA] !== false;
}
