/**
 * O cardápio passa a dizer o que fazer, não só o que existe.
 *
 * A lista responde "o que eu vendo". Não responde a pergunta real do dono: o
 * que eu faço com o cardápio esta semana. Item sem estoque, sem preço, sem
 * foto — tudo está na tela e nada salta aos olhos entre 203 linhas.
 */
import { insightsDeCardapio } from '../insightsDeCardapio';

const p = (over: Record<string, unknown> = {}) =>
  ({
    id: String(Math.random()),
    name: 'Item',
    price: 20,
    is_active: true,
    track_stock: false,
    image: 'foto.jpg',
    ...over,
  } as never);

const chaves = (r: ReturnType<typeof insightsDeCardapio>) => r.map((i) => i.chave);

describe('insightsDeCardapio', () => {
  it('cardápio vazio não inventa diagnóstico', () => {
    expect(insightsDeCardapio([])).toEqual([]);
    expect(insightsDeCardapio(null)).toEqual([]);
  });

  it('cardápio saudável não gera alarme', () => {
    // Seção que sempre acusa alguma coisa é seção que ninguém lê.
    expect(insightsDeCardapio([p(), p(), p()])).toEqual([]);
  });

  it('acusa item ATIVO sem estoque', () => {
    const r = insightsDeCardapio([p({ track_stock: true, stock_quantity: 0 })]);
    expect(chaves(r)).toContain('sem_estoque');
    expect(r[0].recomendacao).toMatch(/cancela/i);
  });

  it('item sem controle de estoque não é acusado por estoque', () => {
    // Sem `track_stock` a quantidade é ignorada pelo backend — cobrar conserto
    // de dado que não é usado só trava quem quer trabalhar.
    const r = insightsDeCardapio([p({ track_stock: false, stock_quantity: 0 })]);
    expect(chaves(r)).not.toContain('sem_estoque');
  });

  it('item PAUSADO sem estoque não é urgência', () => {
    // Ele não está à venda: não há cliente para frustrar.
    const r = insightsDeCardapio([p({ is_active: false, track_stock: true, stock_quantity: 0 })]);
    expect(chaves(r)).not.toContain('sem_estoque');
  });

  it('avisa quando o estoque está no fim, antes de zerar', () => {
    const r = insightsDeCardapio([
      p({ track_stock: true, stock_quantity: 2, low_stock_threshold: 5 }),
    ]);
    expect(chaves(r)).toContain('estoque_baixo');
  });

  it('acusa item ativo com preço zerado', () => {
    // O cliente vê "R$ 0,00" na vitrine — ou pior, fecha o pedido de graça.
    const r = insightsDeCardapio([p({ price: 0 })]);
    expect(chaves(r)).toContain('sem_preco');
  });

  it('acusa itens sem foto e diz a proporção', () => {
    const r = insightsDeCardapio([p({ image: null, image_url: null }), p(), p(), p()]);
    const i = r.find((x) => x.chave === 'sem_foto')!;
    expect(i.valor).toBe('25% dos ativos');
  });

  it('poucos pausados é curadoria, não problema', () => {
    const r = insightsDeCardapio([p({ is_active: false }), p({ is_active: false }), p()]);
    expect(chaves(r)).not.toContain('pausados');
  });

  it('muitos pausados vira diagnóstico', () => {
    const pausados = Array.from({ length: 6 }, () => p({ is_active: false }));
    const r = insightsDeCardapio([...pausados, p()]);
    expect(chaves(r)).toContain('pausados');
  });

  it('o item sem estoque vem antes do item sem foto', () => {
    // Um cancela pedido hoje; o outro reduz conversão aos poucos.
    const r = insightsDeCardapio([
      p({ image: null, image_url: null }),
      p({ track_stock: true, stock_quantity: 0 }),
    ]);
    expect(r[0].chave).toBe('sem_estoque');
  });

  it('quando é UM item, o insight aponta para ele', () => {
    // Com um só dá para levar direto ao produto; com dez, o que fazer é abrir
    // a lista filtrada, e apontar para um seria arbitrário.
    const um = insightsDeCardapio([p({ id: 'abc', price: 0 })]);
    expect(um.find((x) => x.chave === 'sem_preco')!.produtoId).toBe('abc');

    const varios = insightsDeCardapio([p({ price: 0 }), p({ price: 0 })]);
    expect(varios.find((x) => x.chave === 'sem_preco')!.produtoId).toBeUndefined();
  });

  it('toda linha tem recomendação', () => {
    const r = insightsDeCardapio([
      p({ price: 0 }),
      p({ track_stock: true, stock_quantity: 0 }),
      p({ image: null, image_url: null }),
    ]);
    expect(r.length).toBeGreaterThan(0);
    r.forEach((i) => expect(i.recomendacao.trim()).not.toBe(''));
  });
});
