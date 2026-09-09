/**
 * A régua de status que atravessa o topo do pedido.
 *
 * Ela precisa contar a MESMA história que o botão de ação: entrega e retirada
 * são caminhos diferentes. A régua antiga tinha uma etapa chamada
 * "Pronto/Entrega" — uma barra tentando ser os dois caminhos ao mesmo tempo,
 * que não descrevia nenhum dos dois.
 */
import { etapasDoPedido } from '../fluxoDoPedido';

const pedido = (status: string, delivery_method = 'delivery') =>
  ({ status, delivery_method }) as never;

it('entrega termina em "Saiu para entrega" antes de entregue', () => {
  const etapas = etapasDoPedido(pedido('preparing', 'delivery'));
  expect(etapas.map((e) => e.rotulo)).toEqual([
    'Recebido', 'Confirmado', 'Em preparo', 'Saiu para entrega', 'Entregue',
  ]);
});

it('retirada troca a etapa de despacho por "Pronto para retirar"', () => {
  const etapas = etapasDoPedido(pedido('preparing', 'pickup'));
  expect(etapas[3].rotulo).toBe('Pronto para retirar');
  expect(etapas[4].rotulo).toBe('Retirado');
});

it('marca o que já passou, o agora e o que falta', () => {
  const etapas = etapasDoPedido(pedido('preparing', 'delivery'));
  expect(etapas.map((e) => e.estado)).toEqual([
    'concluida', 'concluida', 'atual', 'futura', 'futura',
  ]);
});

it('reconhece os apelidos de status que o backend usa', () => {
  expect(etapasDoPedido(pedido('paid'))[1].estado).toBe('atual');
  expect(etapasDoPedido(pedido('out_for_delivery'))[3].estado).toBe('atual');
  expect(etapasDoPedido(pedido('ready', 'pickup'))[3].estado).toBe('atual');
  expect(etapasDoPedido(pedido('completed'))[4].estado).toBe('atual');
});

it('pedido cancelado não finge progresso', () => {
  const etapas = etapasDoPedido(pedido('cancelled'));
  expect(etapas.every((e) => e.estado === 'futura')).toBe(true);
});

it('status desconhecido cai na primeira etapa em vez de sumir', () => {
  const etapas = etapasDoPedido(pedido('lua_cheia'));
  expect(etapas).toHaveLength(5);
  expect(etapas[0].estado).toBe('atual');
});

it('link de pagamento não tem entregador — segue o caminho da retirada', () => {
  expect(etapasDoPedido(pedido('preparing', 'digital'))[3].rotulo).toBe('Pronto para retirar');
});
