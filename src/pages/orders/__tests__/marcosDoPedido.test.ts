/**
 * A linha do tempo do pedido, com horário e duração de cada etapa.
 *
 * O modal mostrava o progresso como bolinhas acesas: dá para ver ONDE o pedido
 * está, não QUANDO cada coisa aconteceu nem quanto demorou. É a diferença
 * entre "está entregue" e "ficou 40 minutos parado na cozinha" — e a segunda é
 * a que responde a reclamação do cliente.
 *
 * A API já gravava `confirmed_at`, `preparing_at`, `ready_at`,
 * `out_for_delivery_at` e `delivered_at`. Ninguém mostrava.
 */
import { marcosDoPedido, duracaoLegivel } from '../marcosDoPedido';

const base = {
  created_at: '2026-08-08T12:00:00-03:00',
  confirmed_at: '2026-08-08T12:03:00-03:00',
  preparing_at: '2026-08-08T12:05:00-03:00',
  ready_at: '2026-08-08T12:25:00-03:00',
  out_for_delivery_at: '2026-08-08T12:30:00-03:00',
  delivered_at: '2026-08-08T12:52:00-03:00',
};

describe('marcosDoPedido', () => {
  it('devolve as etapas na ordem em que aconteceram', () => {
    const m = marcosDoPedido(base as never);
    expect(m.map((x) => x.chave)).toEqual([
      'created', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered',
    ]);
  });

  it('cada etapa traz quanto tempo levou desde a anterior', () => {
    // É o número que responde "por que demorou": 20 min na cozinha, 22 na rua.
    const m = marcosDoPedido(base as never);
    expect(m.find((x) => x.chave === 'ready')?.minutosDesdeAnterior).toBe(20);
    expect(m.find((x) => x.chave === 'delivered')?.minutosDesdeAnterior).toBe(22);
  });

  it('a primeira etapa não tem duração — não existe "anterior"', () => {
    expect(marcosDoPedido(base as never)[0].minutosDesdeAnterior).toBeNull();
  });

  it('etapa que não aconteceu simplesmente não aparece', () => {
    // Pedido de balcão pula "em entrega". Mostrar a etapa vazia sugeriria que
    // algo travou ali.
    const m = marcosDoPedido({ ...base, out_for_delivery_at: null } as never);
    expect(m.some((x) => x.chave === 'out_for_delivery')).toBe(false);
    // E a duração da seguinte passa a contar da etapa que de fato veio antes.
    expect(m.find((x) => x.chave === 'delivered')?.minutosDesdeAnterior).toBe(27);
  });

  it('cancelamento entra na linha do tempo', () => {
    // É o marco que o dono mais procura quando vai investigar um pedido.
    const m = marcosDoPedido({
      created_at: base.created_at,
      confirmed_at: base.confirmed_at,
      cancelled_at: '2026-08-08T12:10:00-03:00',
    } as never);
    expect(m[m.length - 1].chave).toBe('cancelled');
  });

  it('marco fora de ordem não gera duração negativa', () => {
    // Ajuste manual de pedido pode gravar `ready_at` antes de `preparing_at`.
    // "-5 min" na tela lê como bug e destrói a confiança nos outros números.
    const m = marcosDoPedido({
      created_at: base.created_at,
      preparing_at: '2026-08-08T12:20:00-03:00',
      ready_at: '2026-08-08T12:10:00-03:00',
    } as never);
    for (const x of m) {
      expect(x.minutosDesdeAnterior === null || x.minutosDesdeAnterior >= 0).toBe(true);
    }
  });

  it('pedido só criado devolve uma etapa, não lista vazia', () => {
    const m = marcosDoPedido({ created_at: base.created_at } as never);
    expect(m).toHaveLength(1);
  });

  it('data inválida é ignorada em vez de virar "Invalid Date"', () => {
    const m = marcosDoPedido({ created_at: base.created_at, ready_at: 'sei lá' } as never);
    expect(m).toHaveLength(1);
  });
});

describe('duracaoLegivel', () => {
  it('minutos abaixo de uma hora', () => {
    expect(duracaoLegivel(1)).toBe('1 min');
    expect(duracaoLegivel(45)).toBe('45 min');
  });

  it('acima de uma hora fala em horas — "127 min" ninguém converte de cabeça', () => {
    expect(duracaoLegivel(60)).toBe('1h');
    expect(duracaoLegivel(127)).toBe('2h07');
  });

  it('menos de um minuto não vira "0 min"', () => {
    expect(duracaoLegivel(0)).toBe('na hora');
  });
});
