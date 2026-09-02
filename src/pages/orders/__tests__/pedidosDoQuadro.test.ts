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

  // O "dia" é o de Brasília, não o do fuso de quem abre o painel. O backend
  // manda `created_at` com offset (…-03:00); um pedido entregue às 22h de
  // Brasília ainda é HOJE, mesmo que em UTC já seja o dia seguinte. Se o corte
  // fosse pelo fuso do navegador (ou do CI em UTC), o pedido das 22h sumiria
  // do "Entregue" no meio da noite — justo no pico do delivery.
  it('o corte de "hoje" é o dia de Brasília, não o fuso de quem olha', () => {
    const agoraCedo = new Date('2026-08-27T09:00:00-03:00');
    const itens = pedidosDaColuna(
      [
        pedido('noite', 'delivered', '2026-08-27T22:00:00-03:00'), // 01h UTC do 28
        pedido('manha', 'delivered', '2026-08-27T00:30:00-03:00'), // 03h30 UTC do 27
        pedido('ontemNoite', 'delivered', '2026-08-26T23:30:00-03:00'), // 02h30 UTC do 27
      ],
      done, agoraCedo,
    );
    // "noite" e "manha" são de 27/08 em Brasília; "ontemNoite" é de 26/08.
    expect(itens.map((o) => o.id).sort()).toEqual(['manha', 'noite']);
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
