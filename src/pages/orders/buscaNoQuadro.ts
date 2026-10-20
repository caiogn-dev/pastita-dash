/**
 * Busca do quadro de pedidos: número (com ou sem "#"), nome ou telefone.
 *
 * Telefone só entra a partir de 4 dígitos — "99" casaria com quase todo
 * celular e esconderia o pedido que o operador digitou pelo número.
 */
type PedidoBuscavel = { order_number?: string | null; customer_name?: string | null; customer_phone?: string | null };

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const digitos = (t: string) => t.replace(/\D/g, '');

export function filtrarPedidosDoQuadro<T extends PedidoBuscavel>(pedidos: T[], busca: string): T[] {
  const termo = semAcento(busca.trim().replace(/^#/, ''));
  if (!termo) return pedidos;
  const numeros = digitos(termo);
  return pedidos.filter((p) => {
    if (semAcento(p.order_number || '').includes(termo)) return true;
    if (semAcento(p.customer_name || '').includes(termo)) return true;
    return numeros.length >= 4 && digitos(p.customer_phone || '').includes(numeros);
  });
}
