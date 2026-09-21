/**
 * Os quatro números que respondem "como está meu cardápio agora".
 *
 * A tela abria direto na lista: 203 linhas de produto respondem "o que eu
 * vendo" e nenhuma responde "quanto do meu cardápio está no ar". O painel de
 * referência abre com quatro indicadores — cadastrados, ativos, pausados,
 * sem estoque — e é isso que faz a tela parecer um produto, não uma tabela.
 */
import { numerosDoCardapio } from '../numerosDoCardapio';

const p = (over: Record<string, unknown> = {}) => ({
  id: String(Math.random()), name: 'X', status: 'active', stock_quantity: 5, track_stock: true, ...over,
});

it('conta o que existe, o que está no ar e o que está parado', () => {
  const n = numerosDoCardapio([
    p(), p(), p({ status: 'inactive' }), p({ status: 'paused' }),
  ] as never);

  expect(n.cadastrados).toBe(4);
  expect(n.ativos).toBe(2);
  expect(n.pausados).toBe(2);
});

it('sem estoque é quem controla estoque e zerou', () => {
  const n = numerosDoCardapio([
    p({ stock_quantity: 0 }),
    p({ stock_quantity: 0, track_stock: false }),
    p({ stock_quantity: 3 }),
  ] as never);

  expect(n.semEstoque).toBe(1);
});

it('cardápio vazio não quebra', () => {
  expect(numerosDoCardapio([])).toEqual({
    cadastrados: 0, ativos: 0, pausados: 0, semEstoque: 0,
  });
});
