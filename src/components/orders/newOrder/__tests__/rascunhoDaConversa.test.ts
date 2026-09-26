import { montarRascunho, rascunhoDoEstado } from '../rascunhoDaConversa';

const P = (id: string, name: string) => ({ id, name, price: 10, is_active: true, sku: id, stock_quantity: 0 }) as never;
const PRODUTOS = [P('p1', 'Salada Caesar'), P('p2', 'Suco de Laranja 500ml'), P('p3', 'Brownie')];

describe('montarRascunho', () => {
  it('leva cliente, telefone, endereço, itens achados pelo nome e as notas', () => {
    const r = montarRascunho({
      cliente: { nome: 'Maria Souza', telefone: '5563999990000' },
      carrinho: {
        itens: [{ nome: 'salada caesar', quantidade: 2, preco: 30 }, { nome: 'Brownie', quantidade: 1, preco: 8 }],
        endereco: 'Rua 1, 100 - Centro',
        notas: 'sem cebola',
        entrega: 'delivery',
      },
    }, PRODUTOS);
    expect(r.cliente).toEqual({ nome: 'Maria Souza', telefone: '5563999990000' });
    expect(r.endereco).toBe('Rua 1, 100 - Centro');
    expect(r.entrega).toBe('delivery');
    expect(r.itens.map((i) => [i.product.id, i.quantity])).toEqual([['p1', 2], ['p3', 1]]);
    expect(r.observacoes).toBe('sem cebola');
    expect(r.naoAchados).toEqual([]);
  });

  it('acento e caixa não atrapalham o casamento pelo nome', () => {
    const r = montarRascunho({ carrinho: { itens: [{ nome: 'SUCO DE LARANJA 500ML', quantidade: 1 }] } }, PRODUTOS);
    expect(r.itens[0].product.id).toBe('p2');
  });

  it('nome parcial com um único candidato também serve', () => {
    const r = montarRascunho({ carrinho: { itens: [{ nome: 'Caesar', quantidade: 1 }] } }, PRODUTOS);
    expect(r.itens[0].product.id).toBe('p1');
  });

  it('item que não existe no cardápio vai para as observações, não some', () => {
    const r = montarRascunho({
      carrinho: { itens: [{ nome: 'Pizza calabresa', quantidade: 3 }], notas: 'tocar a campainha' },
    }, PRODUTOS);
    expect(r.itens).toEqual([]);
    expect(r.naoAchados).toEqual(['3× Pizza calabresa']);
    expect(r.observacoes).toBe('tocar a campainha\nPedido no chat e não achado no cardápio: 3× Pizza calabresa');
  });

  it('retirada é reconhecida', () => {
    expect(montarRascunho({ carrinho: { entrega: 'pickup' } }, []).entrega).toBe('pickup');
    expect(montarRascunho({ carrinho: { entrega: 'retirada' } }, []).entrega).toBe('pickup');
    expect(montarRascunho({ carrinho: { entrega: false } }, []).entrega).toBe('pickup');
  });

  it('endereço estruturado vira uma linha legível', () => {
    const r = montarRascunho({
      carrinho: { endereco: { street: 'Rua 2', number: '50', neighborhood: 'Plano Diretor', city: 'Palmas' } },
    }, []);
    expect(r.endereco).toBe('Rua 2, 50 - Plano Diretor - Palmas');
  });

  it('contexto vazio não quebra e usa o telefone da conversa', () => {
    const r = montarRascunho({}, [], { nome: 'Ana', telefone: '5563988887777' });
    expect(r.cliente).toEqual({ nome: 'Ana', telefone: '5563988887777' });
    expect(r.itens).toEqual([]);
    expect(r.endereco).toBe('');
  });
});

describe('rascunhoDoEstado', () => {
  it('só aceita um rascunho com cliente e itens', () => {
    const r = montarRascunho({ cliente: { nome: 'A', telefone: '1' } }, []);
    expect(rascunhoDoEstado({ rascunhoDoPedido: r })).toBe(r);
    expect(rascunhoDoEstado(null)).toBeNull();
    expect(rascunhoDoEstado({ rascunhoDoPedido: { x: 1 } })).toBeNull();
  });
});
