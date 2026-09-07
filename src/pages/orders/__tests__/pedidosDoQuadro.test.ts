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

describe('o "hoje" é o dia do Brasil, não o fuso de quem abre o painel', () => {
  // O corte de "entregue hoje" tem de ser o dia comercial brasileiro
  // (America/Sao_Paulo), independente do fuso do runtime/navegador. Um pedido
  // das 21h de ontem no horário do Brasil vira "hoje" em UTC — não pode entrar.
  const done = coluna('done', ['delivered', 'completed']);

  it('não conta pedido de ontem que, em UTC, cai no mesmo dia de agora', () => {
    const itens = pedidosDaColuna(
      [
        // 21h de 26/08 no Brasil = 00h de 27/08 em UTC (mesmo "dia" que agora em UTC)
        pedido('ontem-noite', 'delivered', '2026-08-26T21:00:00-03:00'),
        pedido('hoje-cedo', 'delivered', '2026-08-27T00:30:00-03:00'),
      ],
      done, AGORA,
    );
    expect(itens.map((o) => o.id)).toEqual(['hoje-cedo']);
  });

  it('conta o pedido logo após a meia-noite brasileira', () => {
    const itens = pedidosDaColuna(
      [pedido('virada', 'delivered', '2026-08-27T00:05:00-03:00')],
      done, AGORA,
    );
    expect(itens.map((o) => o.id)).toEqual(['virada']);
  });
});

describe('qual coluna é o passado', () => {
  it('é a de finalizados', () => {
    expect(ENTREGUES_DE_HOJE).toBe('done');
  });
});
