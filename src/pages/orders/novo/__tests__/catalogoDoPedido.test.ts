import { categoriasDoCatalogo, filtrarCatalogo, seloDeEstoque } from '../catalogoDoPedido';

const p = (o: Record<string, unknown>) => ({
  id: String(o.name), name: 'x', price: 10, stock_quantity: 0, is_active: true, track_stock: false,
  category_name: null, sku: '', ...o,
}) as never;

const produtos = [
  p({ name: 'Salada Caesar', category_name: 'Saladas' }),
  p({ name: 'Salada de Atum', category_name: 'Saladas' }),
  p({ name: 'Brownie', category_name: 'Sobremesas', sku: 'BRW1' }),
  p({ name: 'Água', category_name: null }),
];

test('categorias com contagem, na ordem em que aparecem, e "Outros" no fim', () => {
  expect(categoriasDoCatalogo(produtos)).toEqual([
    { nome: 'Saladas', quantidade: 2 },
    { nome: 'Sobremesas', quantidade: 1 },
    { nome: 'Outros', quantidade: 1 },
  ]);
});

test('busca ignora acento e caixa, e acha pelo código', () => {
  expect(filtrarCatalogo(produtos, null, 'agua').map((x: { name: string }) => x.name)).toEqual(['Água']);
  expect(filtrarCatalogo(produtos, null, 'brw1').map((x: { name: string }) => x.name)).toEqual(['Brownie']);
});

test('categoria filtra; busca vale por cima da categoria (procura em tudo)', () => {
  expect(filtrarCatalogo(produtos, 'Saladas', '').length).toBe(2);
  expect(filtrarCatalogo(produtos, 'Saladas', 'brownie').map((x: { name: string }) => x.name)).toEqual(['Brownie']);
});

test('selo de estoque só para quem controla estoque', () => {
  expect(seloDeEstoque(p({ track_stock: false, stock_quantity: 0 }))).toBeNull();
  expect(seloDeEstoque(p({ track_stock: true, stock_quantity: 0 }))).toEqual({ texto: 'Esgotado', tom: 'perigo', esgotado: true });
  expect(seloDeEstoque(p({ track_stock: true, stock_quantity: 3 }))).toEqual({ texto: '3 disponíveis', tom: 'alerta', esgotado: false });
  expect(seloDeEstoque(p({ track_stock: true, stock_quantity: 40 }))).toEqual({ texto: '40 disponíveis', tom: 'ok', esgotado: false });
});
