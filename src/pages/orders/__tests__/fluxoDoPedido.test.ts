/**
 * A régua de status que atravessa o topo do pedido.
 *
 * Ela precisa contar a MESMA história que o botão de ação: entrega e retirada
 * são caminhos diferentes. A régua antiga tinha uma etapa chamada
 * "Pronto/Entrega" — uma barra tentando ser os dois caminhos ao mesmo tempo,
 * que não descrevia nenhum dos dois.
 */
import { etapasDoPedido, horariosDasEtapas } from '../fluxoDoPedido';

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

describe('horários dentro da régua', () => {
  const marco = (chave: string, hora: string, minutos: number | null = null) => ({
    chave, rotulo: chave, quando: new Date(`2026-09-09T${hora}:00-03:00`),
    minutosDesdeAnterior: minutos,
  });

  it('põe o horário de cada marco na etapa correspondente', () => {
    const h = horariosDasEtapas([
      marco('created', '07:29'),
      marco('confirmed', '07:39', 10),
      marco('preparing', '08:50', 71),
      marco('out_for_delivery', '09:00', 10),
      marco('delivered', '09:14', 14),
    ]);
    expect(h.recebido?.hora).toBe('07:29');
    expect(h.confirmado?.hora).toBe('07:39');
    expect(h.preparo?.hora).toBe('08:50');
    expect(h.despacho?.hora).toBe('09:00');
    expect(h.fim?.hora).toBe('09:14');
  });

  it('guarda quanto tempo levou desde a etapa anterior', () => {
    const h = horariosDasEtapas([marco('created', '07:29'), marco('confirmed', '07:39', 10)]);
    expect(h.confirmado?.minutos).toBe(10);
  });

  it('duas marcações na mesma etapa ficam com a primeira', () => {
    // `ready` e `out_for_delivery` caem os dois no despacho.
    const h = horariosDasEtapas([marco('ready', '08:55'), marco('out_for_delivery', '09:00')]);
    expect(h.despacho?.hora).toBe('08:55');
  });

  it('retirada pelo cliente fecha o pedido igual entrega', () => {
    expect(horariosDasEtapas([marco('picked_up', '10:05')]).fim?.hora).toBe('10:05');
  });

  it('cancelamento não vira etapa da régua', () => {
    expect(horariosDasEtapas([marco('cancelled', '11:00')]).fim).toBeUndefined();
  });

  it('sem marcos, nenhuma etapa tem horário', () => {
    expect(horariosDasEtapas([])).toEqual({});
  });
});
