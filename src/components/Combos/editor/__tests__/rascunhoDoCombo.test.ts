import {
  rascunhoVazio,
  deCombo,
  paraPayload,
  regraDoGrupo,
  comRegra,
  novoGrupo,
  adicionarProdutos,
  escolherProdutoBase,
  marcarComoBrinde,
  aplicarDesconto,
  precoAPartirDe,
  pendencias,
} from '../rascunhoDoCombo';
import type { StoreCombo, StoreProduct } from '../../../../services/storesApi';

const produto = (id: string, nome: string, preco: number, extra: Partial<StoreProduct> = {}) =>
  ({ id, name: nome, price: preco, variants: [], category_name: 'Pratos', ...extra }) as unknown as StoreProduct;

const FRANGO = produto('p1', 'Frango grelhado', 30);
const CARNE = produto('p2', 'Carne de panela', 35);
const SUCO = produto('p3', 'Suco', 8, { category_name: 'Bebidas' });
const RONDELLI = produto('p4', 'Rondelli', 40, {
  variants: [
    { id: 'v1', name: 'Frango', price: 40, stock_quantity: 5, is_active: true },
    { id: 'v2', name: 'Queijo', price: 42, stock_quantity: 0, is_active: true },
  ] as unknown as StoreProduct['variants'],
});
const PRODUTOS = [FRANGO, CARNE, SUCO, RONDELLI];

describe('regra do grupo em frase', () => {
  it('lê exatamente / até / entre a partir de mínimo e máximo', () => {
    expect(regraDoGrupo({ minimo: 3, maximo: 3 })).toEqual({ modo: 'exatamente', a: 3, b: 3 });
    expect(regraDoGrupo({ minimo: 0, maximo: 2 })).toEqual({ modo: 'ate', a: 0, b: 2 });
    expect(regraDoGrupo({ minimo: 1, maximo: 4 })).toEqual({ modo: 'entre', a: 1, b: 4 });
  });

  it('grava a frase de volta em mínimo e máximo', () => {
    const g = novoGrupo('produtos');
    expect(comRegra(g, 'exatamente', 5)).toMatchObject({ minimo: 5, maximo: 5 });
    expect(comRegra(g, 'ate', 2)).toMatchObject({ minimo: 0, maximo: 2 });
    expect(comRegra(g, 'entre', 4, 1)).toMatchObject({ minimo: 1, maximo: 4 });
  });
});

describe('opções do grupo', () => {
  it('adicionar produtos não duplica e herda o preço do cadastro', () => {
    let g = adicionarProdutos(novoGrupo('produtos'), [FRANGO, CARNE]);
    g = adicionarProdutos(g, [FRANGO]);
    expect(g.opcoes.map(o => o.produtoId)).toEqual(['p1', 'p2']);
    expect(g.opcoes[0].preco).toBe(30);
  });

  it('produto base de variações vira uma opção por variação ativa', () => {
    const g = escolherProdutoBase(novoGrupo('variantes'), RONDELLI);
    expect(g.produtoBaseId).toBe('p4');
    expect(g.opcoes.map(o => o.nome)).toEqual(['Frango', 'Queijo']);
    expect(g.opcoes[1].estoque).toBe(0);
  });

  it('brinde zera o preço de todas as opções; desconto aplica a porcentagem', () => {
    const g = adicionarProdutos(novoGrupo('produtos'), [FRANGO, SUCO]);
    expect(marcarComoBrinde(g).opcoes.map(o => o.precoProprio)).toEqual([0, 0]);
    // Semanal da Agrião: 0,97 × o preço de cada prato.
    expect(aplicarDesconto(g, 3).opcoes.map(o => o.precoProprio)).toEqual([29.1, 7.76]);
    expect(aplicarDesconto(g, 0).opcoes.map(o => o.precoProprio)).toEqual([undefined, undefined]);
  });
});

describe('ida e volta com o formato da API', () => {
  const salvo = {
    id: 'c1', store: 's1', name: 'Família', slug: 'familia', description: 'Para 4',
    price: 0, dynamic_pricing: true, is_active: true, featured: false,
    track_stock: false, stock_quantity: 0, image_url: 'https://x/f.jpg',
    metadata: { inclui: ['2 molhos'], loyalty_units: 4, outro: 'fica' },
    groups: [
      {
        id: 'g1', product_id: null, product_name: '', title: 'Escolha 3 pratos',
        is_required: true, min_selections: 3, max_selections: 3, allow_duplicate_variants: true,
        position: 0, variant_limits: [],
        product_options: [
          { product_id: 'p1', name: 'Frango grelhado', price: 30, max_selections: 3 },
          { product_id: 'p2', name: 'Carne de panela', price: 35, max_selections: 3, price_override: 33.95 },
        ],
      },
      {
        id: 'g2', product_id: 'p4', product_name: 'Rondelli', title: '',
        is_required: false, min_selections: 0, max_selections: 1, allow_duplicate_variants: false,
        position: 1, product_options: [],
        variant_limits: [{ id: 'l1', variant_id: 'v1', variant_name: 'Frango', variant_sku: '', stock: 5, max_selections: 1 }],
      },
    ],
  } as unknown as StoreCombo;

  it('o que entra é o que sai, campo a campo', () => {
    const payload = paraPayload(deCombo(salvo, PRODUTOS), 's1');
    expect(payload).toMatchObject({
      store: 's1', name: 'Família', description: 'Para 4', price: 0, dynamic_pricing: true,
      image_url: 'https://x/f.jpg', is_active: true, featured: false, track_stock: false, stock_quantity: 0,
      metadata: { inclui: ['2 molhos'], loyalty_units: 4, outro: 'fica' },
    });
    expect(payload.groups).toEqual([
      {
        product_id: null, title: 'Escolha 3 pratos', is_required: true, min_selections: 3, max_selections: 3,
        allow_duplicate_variants: true, position: 0, variant_limits: [],
        product_options: [
          { product_id: 'p1', max_selections: 3, price_override: undefined },
          { product_id: 'p2', max_selections: 3, price_override: 33.95 },
        ],
      },
      {
        product_id: 'p4', title: '', is_required: false, min_selections: 0, max_selections: 1,
        allow_duplicate_variants: false, position: 1, product_options: [],
        variant_limits: [{ variant_id: 'v1', max_selections: 1, price_override: undefined }],
      },
    ]);
  });

  it('brinde e selos vazios saem do metadata em vez de virar lixo', () => {
    const r = { ...deCombo(salvo, PRODUTOS), inclui: [], selos: undefined };
    const meta = paraPayload(r, 's1').metadata as Record<string, unknown>;
    expect(meta).toEqual({ outro: 'fica' });
  });
});

describe('preço "a partir de" e pendências', () => {
  it('preço fechado é o próprio preço; pela soma, base + o mínimo mais barato de cada grupo', () => {
    const r = rascunhoVazio();
    expect(precoAPartirDe({ ...r, preco: 50 })).toBe(50);
    const g = comRegra(adicionarProdutos(novoGrupo('produtos'), [FRANGO, CARNE]), 'exatamente', 2);
    const pelaSoma = { ...r, precoPelaSoma: true, preco: 5, grupos: [{ ...g, podeRepetir: true }] };
    // pode repetir: 2 × o mais barato (30) + base 5
    expect(precoAPartirDe(pelaSoma)).toBe(65);
    // sem repetir: 30 + 35 + 5
    expect(precoAPartirDe({ ...pelaSoma, grupos: [{ ...g, podeRepetir: false }] })).toBe(70);
  });

  it('aponta o que falta, por grupo, em frase curta', () => {
    const vazio = rascunhoVazio();
    expect(pendencias(vazio).map(p => p.texto)).toEqual(['Dê um nome', 'Defina o preço']);
    const semOpcoes = { ...vazio, nome: 'X', preco: 10, grupos: [novoGrupo('produtos')] };
    const p = pendencias(semOpcoes);
    expect(p).toEqual([{ grupo: semOpcoes.grupos[0].chave, texto: 'Adicione opções' }]);
    const poucas = { ...semOpcoes, grupos: [comRegra(adicionarProdutos(novoGrupo('produtos'), [FRANGO]), 'exatamente', 3)] };
    expect(pendencias(poucas)[0].texto).toBe('Faltam opções para escolher 3');
    expect(pendencias({ ...poucas, grupos: [{ ...poucas.grupos[0], podeRepetir: true }] })).toEqual([]);
  });

  it('pela soma, preço-base zero é válido', () => {
    expect(pendencias({ ...rascunhoVazio(), nome: 'X', precoPelaSoma: true, preco: 0 })).toEqual([]);
  });
});
