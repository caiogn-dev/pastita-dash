/**
 * As etapas do pedido, na ordem em que acontecem.
 *
 * A régua de status é a primeira coisa que se lê no pedido, então ela tem que
 * contar a MESMA história que o botão de ação (`proximaAcao.ts`): entrega e
 * retirada são caminhos diferentes. A régua antiga tinha uma etapa chamada
 * "Pronto/Entrega" — uma barra tentando ser os dois caminhos ao mesmo tempo,
 * que não descrevia nenhum.
 *
 * Os rótulos seguem o vocabulário que o cliente recebe no WhatsApp: quem
 * atende lê a mesma palavra que a pessoa do outro lado.
 */
import type { Order } from '../../types';

export type EstadoDaEtapa = 'concluida' | 'atual' | 'futura';

export interface EtapaDoPedido {
  /** Chave estável para `key` e para testes. */
  chave: 'recebido' | 'confirmado' | 'preparo' | 'despacho' | 'fim';
  rotulo: string;
  estado: EstadoDaEtapa;
}

type PedidoDoFluxo = Pick<Order, 'status' | 'delivery_method'>;

/** Retirada e link de pagamento não têm entregador. Mesma régua do `proximaAcao`. */
const ehRetirada = (pedido: PedidoDoFluxo) =>
  pedido.delivery_method === 'pickup' || pedido.delivery_method === 'digital';

/** Onde cada status do backend cai na régua de 5 etapas. */
const POSICAO: Record<string, number> = {
  pending: 0, processing: 0,
  confirmed: 1, paid: 1,
  preparing: 2,
  ready: 3, out_for_delivery: 3, shipped: 3,
  delivered: 4, completed: 4,
};

export function etapasDoPedido(pedido: PedidoDoFluxo): EtapaDoPedido[] {
  const status = (pedido.status || '').toLowerCase();
  const cancelado = status === 'cancelled';
  // Status desconhecido cai na primeira etapa: some do fluxo seria pior que
  // mostrá-lo no começo — o pedido existe e está em algum lugar.
  const atual = POSICAO[status] ?? 0;
  const retirada = ehRetirada(pedido);

  const rotulos: Array<[EtapaDoPedido['chave'], string]> = [
    ['recebido', 'Recebido'],
    ['confirmado', 'Confirmado'],
    ['preparo', 'Em preparo'],
    ['despacho', retirada ? 'Pronto para retirar' : 'Saiu para entrega'],
    ['fim', retirada ? 'Retirado' : 'Entregue'],
  ];

  return rotulos.map(([chave, rotulo], i) => ({
    chave,
    rotulo,
    // Cancelado não finge progresso: a régua fica apagada e quem informa o
    // cancelamento é o selo de status, que fala mais alto.
    estado: cancelado
      ? 'futura'
      : i < atual
        ? 'concluida'
        : i === atual
          ? 'atual'
          : 'futura',
  }));
}

/** O que a régua mostra em cada etapa, além do rótulo. */
export interface HorarioDaEtapa {
  /** "07:29" — quando a etapa aconteceu. */
  hora: string;
  /** Minutos desde a etapa anterior, para a linha entre as bolinhas. */
  minutos: number | null;
}

/** De qual marco do pedido sai o horário de cada etapa da régua. */
const ETAPA_DO_MARCO: Record<string, EtapaDoPedido['chave']> = {
  created: 'recebido',
  paid: 'confirmado',
  confirmed: 'confirmado',
  preparing: 'preparo',
  ready: 'despacho',
  out_for_delivery: 'despacho',
  picked_up: 'fim',
  delivered: 'fim',
};

/**
 * Os horários do pedido, encaixados nas etapas da régua.
 *
 * Eles viviam num cartão "Tempos" na coluna do dinheiro — lugar errado por
 * duas razões: horário é irmão do status, não do pagamento; e aquele cartão
 * esticava a coluna lateral, deixando 155px de buraco ao lado dos itens.
 *
 * Na régua, cada bolinha ganha a hora e cada trecho de linha ganha a duração:
 * a linha ENTRE duas etapas é, literalmente, o tempo que se passou entre elas.
 */
export function horariosDasEtapas(
  marcos: Array<{ chave: string; quando: Date; minutosDesdeAnterior: number | null }>,
): Partial<Record<EtapaDoPedido['chave'], HorarioDaEtapa>> {
  const saida: Partial<Record<EtapaDoPedido['chave'], HorarioDaEtapa>> = {};
  for (const marco of marcos) {
    const etapa = ETAPA_DO_MARCO[marco.chave];
    // Cancelado e estornado não são etapas do fluxo — o selo de status conta
    // essa história, e mais alto.
    if (!etapa) continue;
    // `ready` e `out_for_delivery` caem os dois no despacho: vale o primeiro,
    // que é quando a etapa de fato começou.
    if (saida[etapa]) continue;
    saida[etapa] = {
      hora: marco.quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      minutos: marco.minutosDesdeAnterior,
    };
  }
  return saida;
}
