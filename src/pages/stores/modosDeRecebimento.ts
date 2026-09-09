/**
 * Como o cliente recebe o pedido: entrega, retirada, ou os dois.
 *
 * Os campos `delivery_enabled` / `pickup_enabled` existem no `Store` desde
 * sempre, a API os expõe e o storefront JÁ os respeita (`DeliveryBar.jsx`, com
 * testes). O que faltava era o dono poder mudar: só o wizard de onboarding
 * escrevia esses campos, uma vez, na criação da loja.
 */

export interface ModosDeRecebimento {
  delivery: boolean;
  pickup: boolean;
}

export type Modo = keyof ModosDeRecebimento;

/**
 * O novo estado depois de mexer num interruptor — ou `null` quando a mudança
 * deixaria a loja sem NENHUMA forma de receber.
 *
 * Esse é o único estado proibido: com entrega e retirada desligadas, o
 * cardápio segue no ar, o cliente monta o carrinho e só descobre no fim que
 * não há como fechar o pedido.
 */
export function aoAlternarModo(
  atual: ModosDeRecebimento,
  modo: Modo,
  ligado: boolean,
): ModosDeRecebimento | null {
  const novo = { ...atual, [modo]: ligado };
  if (!novo.delivery && !novo.pickup) return null;
  return novo;
}

/** O que o cliente vai ver, dito em uma frase. */
export function resumoDosModos(modos: ModosDeRecebimento): string {
  if (modos.delivery && modos.pickup) return 'O cliente escolhe entre entrega e retirada.';
  if (modos.delivery) return 'Só entrega. A retirada não aparece no cardápio.';
  if (modos.pickup) return 'Só retirada. A entrega não aparece no cardápio.';
  // Não deve acontecer (o `aoAlternarModo` barra), mas uma loja antiga pode
  // ter chegado assim pelo admin do Django.
  return 'Nenhuma forma de receber está ligada — o cliente não consegue fechar o pedido.';
}
