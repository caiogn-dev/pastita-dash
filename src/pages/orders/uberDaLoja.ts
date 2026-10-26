/**
 * O botão "Solicitar motorista Uber" só aparece para loja com opt-in (26/10).
 *
 * As credenciais do Uber são da PLATAFORMA, não da loja: o botão aparecia em
 * todo pedido de entrega de toda loja e nunca foi usado (583 pedidos, 0 com
 * Uber). O servidor recusa com 403 sem `metadata.uber_direct === true`.
 */
export const lojaTemUber = (loja?: { metadata?: Record<string, unknown> } | null): boolean =>
  loja?.metadata?.uber_direct === true;
