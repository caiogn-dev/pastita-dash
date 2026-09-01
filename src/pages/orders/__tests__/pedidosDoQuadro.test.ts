import { pedidosDaColuna, ENTREGUES_DE_HOJE } from '../pedidosDoQuadro';

/**
 * O quadro tinha 89 pedidos em "Entregue" e zero nas outras quatro colunas.
 * Um kanban serve para ver o trabalho do dia; virou uma pilha de histórico com
 * quatro colunas escritas "Arraste aqui".
 *
 * A regra NÃO é limitar o quadro inteiro ao dia. Coluna de trabalho em aberto
 * precisa mostrar o pedido atrasado de ontem — esconder um pedido que ninguém
 * despachou seria perigoso. Só "Entregue" é passado: ali fica o de hoje, e o
 * resto vive na página de Histórico.
 */

const AGORA = new Date('2026-08-27T16:00:00-03:00');

const pedido = (id: string, status: string, quando: string) => ({
  id,
  status,
  created_at: quando,
});

const coluna = (id: string, statuses: string[]) => ({ id, statuses });

describe('coluna de finalizados', () => {
  const done = coluna('done', ['delivered', 'completed']);

  it('mostra o que foi entregue hoje', () => {
    const itens = pedidosDaColuna(
      [pedido('a', 'delivered', '2026-08-27T12:00:00-03:00')],
      done, AGORA,
    );
    expect(itens.map((o) => o.id)).toEqual(['a']);
  });

  it('não arrasta o que foi entregue ontem', () => {
    const itens = pedidosDaColuna(
      [
        pedido('hoje', 'delivered', '2026-08-27T09:00:00-03:00'),
        pedido('ontem', 'delivered', '2026-08-26T21:00:00-03:00'),
        pedido('semana', 'completed', '2026-08-20T10:00:00-03:00'),
      ],
      done, AGORA,
    );
    expect(itens.map((o) => o.id)).toEqual(['hoje']);
  });

  it('vale para "completed" também, não só "delivered"', () => {
    const itens = pedidosDaColuna(
      [pedido('c', 'completed', '2026-08-27T08:00:00-03:00')],
      done, AGORA,
    );
    expect(itens.map((o) => o.id)).toEqual(['c']);
  });
});

describe('colunas de trabalho em aberto', () => {
  // Estas NÃO podem esconder nada: pedido parado de ontem é justamente o que
  // precisa aparecer.
  const emAberto = [
    coluna('pending', ['pending']),
    coluna('confirmed', ['confirmed']),
    coluna('preparing', ['preparing']),
    coluna('dispatch', ['out_for_delivery']),
  ];

  it.each(emAberto)('$id mantém o pedido de ontem à vista', (col) => {
    const status = col.statuses[0];
    const itens = pedidosDaColuna(
      [
        pedido('hoje', status, '2026-08-27T10:00:00-03:00'),
        pedido('ontem', status, '2026-08-26T19:00:00-03:00'),
      ],
      col, AGORA,
    );
    expect(itens.map((o) => o.id).sort()).toEqual(['hoje', 'ontem']);
  });
});

describe('regras que já valiam', () => {
  it('cancelado não entra em coluna nenhuma', () => {
    const itens = pedidosDaColuna(
      [pedido('x', 'cancelled', '2026-08-27T10:00:00-03:00')],
      coluna('pending', ['pending', 'cancelled']), AGORA,
    );
    expect(itens).toEqual([]);
  });

  it('mais novo primeiro', () => {
    const itens = pedidosDaColuna(
      [
        pedido('velho', 'pending', '2026-08-27T08:00:00-03:00'),
        pedido('novo', 'pending', '2026-08-27T15:00:00-03:00'),
      ],
      coluna('pending', ['pending']), AGORA,
    );
    expect(itens.map((o) => o.id)).toEqual(['novo', 'velho']);
  });

  it('a coluna só recebe os status dela', () => {
    const itens = pedidosDaColuna(
      [pedido('p', 'preparing', '2026-08-27T10:00:00-03:00')],
      coluna('pending', ['pending']), AGORA,
    );
    expect(itens).toEqual([]);
  });
});

describe('qual coluna é o passado', () => {
  it('é a de finalizados', () => {
    expect(ENTREGUES_DE_HOJE).toBe('done');
  });
});

describe('o dia é o da operação, não o do servidor', () => {
  // A Vercel roda em UTC. Se o "mesmo dia" for medido no fuso do servidor, um
  // pedido entregue às 21h no Brasil (00h do dia seguinte em UTC) muda de dia
  // sozinho e some — ou reaparece — no quadro. O corte tem que ser o do balcão
  // (America/Sao_Paulo, -03:00), aconteça onde o código rodar.
  const done = coluna('done', ['delivered', 'completed']);

  it('23h30 de hoje no Brasil continua sendo hoje, mesmo já sendo amanhã em UTC', () => {
    // 2026-08-27T23:30-03:00 = 2026-08-28T02:30Z. Em UTC seria "amanhã".
    const agora = new Date('2026-08-27T23:59:00-03:00');
    const itens = pedidosDaColuna(
      [pedido('tarde', 'delivered', '2026-08-27T23:30:00-03:00')],
      done, agora,
    );
    expect(itens.map((o) => o.id)).toEqual(['tarde']);
  });

  it('entregue ontem à noite não volta ao quadro por causa do UTC', () => {
    // agora 2026-08-27T00:30-03:00 = 2026-08-27T03:30Z.
    // ontem  2026-08-26T22:00-03:00 = 2026-08-27T01:00Z — MESMO dia em UTC.
    const agora = new Date('2026-08-27T00:30:00-03:00');
    const itens = pedidosDaColuna(
      [pedido('ontem', 'delivered', '2026-08-26T22:00:00-03:00')],
      done, agora,
    );
    expect(itens).toEqual([]);
  });

  it('respeita o fuso da loja, não um fixo — mesma entrada, corte diferente', () => {
    // Loja fora de São Paulo: o corte do dia tem que ser o dela.
    // pedido 2026-08-27T23:00-03:00 = 2026-08-28T02:00Z
    // agora  2026-08-28T01:00-03:00 = 2026-08-28T04:00Z
    const agora = new Date('2026-08-28T01:00:00-03:00');
    const entrada = [pedido('virada', 'delivered', '2026-08-27T23:00:00-03:00')];

    // Em São Paulo (-03): pedido é dia 27, agora é dia 28 → fora.
    expect(
      pedidosDaColuna(entrada, done, agora, 'America/Sao_Paulo').map((o) => o.id),
    ).toEqual([]);
    // Numa loja em UTC: ambos caem no dia 28 → dentro.
    expect(
      pedidosDaColuna(entrada, done, agora, 'UTC').map((o) => o.id),
    ).toEqual(['virada']);
  });
});
