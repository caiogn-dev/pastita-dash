/**
 * O próximo passo de um pedido, em UM lugar só.
 *
 * Cada mudança de status dispara uma mensagem no WhatsApp do cliente, então o
 * caminho não é cosmético: é quantas vezes a pessoa é avisada e com que texto.
 *
 * ENTREGA e RETIRADA são caminhos diferentes, e o erro de tratá-los igual tem
 * nome e data — pedido CE-2608129257 (Diana, 12/ago). A página de pedido
 * levava todo mundo por `ready` antes de `out_for_delivery`; a cliente, que era
 * de entrega, recebeu "pronto para retirada" e, dois segundos depois, "está a
 * caminho". O kanban já ramificava certo; a página de pedido tinha a própria
 * cópia da regra e ela estava errada. Por isso agora é função única — as duas
 * telas importam daqui e não têm como divergir de novo.
 *
 *   entrega:  preparando → saiu para entrega → entregue
 *   retirada: preparando → pronto p/ retirada → entregue
 */
import type { Order } from '../../types';

export interface ProximaAcao {
  /** Status a enviar no PATCH. */
  status: string;
  /** Texto do botão. */
  rotulo: string;
  /** Classe de cor usada pelo cartão do kanban. */
  cor: string;
}

/** Retirada e digital não têm entregador; o resto é entrega. */
const ehRetirada = (pedido: Order) =>
  pedido.delivery_method === 'pickup' || pedido.delivery_method === 'digital';

export const proximaAcaoDoPedido = (pedido: Order): ProximaAcao | null => {
  switch (pedido.status) {
    case 'pending':
    case 'processing':
      return { status: 'confirmed', rotulo: 'Confirmar', cor: 'bg-blue-500 hover:bg-blue-600' };

    case 'confirmed':
    case 'paid':
      return { status: 'preparing', rotulo: 'Preparar', cor: 'bg-orange-500 hover:bg-orange-600' };

    case 'preparing':
      return ehRetirada(pedido)
        ? { status: 'ready', rotulo: 'Pronto p/ Retirada', cor: 'bg-indigo-500 hover:bg-indigo-600' }
        : { status: 'out_for_delivery', rotulo: 'Saiu p/ Entrega', cor: 'bg-indigo-500 hover:bg-indigo-600' };

    case 'ready':
      // Numa entrega, `ready` só acontece por caminho antigo ou pela cozinha:
      // daqui ainda falta despachar. Numa retirada, o próximo é o cliente levar.
      return ehRetirada(pedido)
        ? { status: 'delivered', rotulo: 'Retirado ✓', cor: 'bg-emerald-500 hover:bg-emerald-600' }
        : { status: 'out_for_delivery', rotulo: 'Saiu p/ Entrega', cor: 'bg-indigo-500 hover:bg-indigo-600' };

    case 'out_for_delivery':
    case 'shipped':
      return { status: 'delivered', rotulo: 'Entregue ✓', cor: 'bg-emerald-500 hover:bg-emerald-600' };

    default:
      return null;
  }
};
