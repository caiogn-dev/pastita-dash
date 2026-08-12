import { buildBarcodeCatalogDoc } from '../labelPrint';

/**
 * A folha de códigos existe para não ter que bipar produto por produto
 * descobrindo o código. Para isso ela precisa do preço — quem confere no
 * caixa confere pelo preço, não pelo SKU — e precisa CABER: com muitas lojas,
 * duas colunas grandes viram um calhamaço.
 */
const loja = (produtos: object[]) => [{ name: 'Cê Saladas', products: produtos }] as never;

describe('folha de códigos de barras', () => {
  it('mostra o preço junto do nome e do código', () => {
    const html = buildBarcodeCatalogDoc(loja([
      { name: 'Queridinha', barcode: '2411661232460', price: 36.99 },
    ]));
    expect(html).toContain('Queridinha');
    expect(html).toContain('R$ 36,99');
    expect(html).toContain('2411661232460');
  });

  it('preço usa vírgula, como no resto do painel', () => {
    const html = buildBarcodeCatalogDoc(loja([{ name: 'X', price: '9.5' }]));
    expect(html).toContain('R$ 9,50');
  });

  it('produto sem preço não imprime R$ vazio', () => {
    const html = buildBarcodeCatalogDoc(loja([{ name: 'X', barcode: '2411661232460' }]));
    expect(html).not.toContain('R$');
  });

  it('compacta usa 4 colunas; a normal usa 2', () => {
    const compacta = buildBarcodeCatalogDoc(loja([{ name: 'X' }]), { compacto: true });
    const normal = buildBarcodeCatalogDoc(loja([{ name: 'X' }]));
    expect(compacta).toContain('repeat(4,');
    expect(normal).toContain('repeat(2,');
  });

  it('compacta corta categoria e SKU, que não cabem nem decidem nada', () => {
    const produto = [{ name: 'X', category: 'Saladas', sku: 'SKU-1', price: 10 }];
    expect(buildBarcodeCatalogDoc(loja(produto), { compacto: true })).not.toContain('SKU-1');
    expect(buildBarcodeCatalogDoc(loja(produto))).toContain('SKU-1');
  });

  it('produto sem código diz que não tem, em vez de imprimir espaço vazio', () => {
    const html = buildBarcodeCatalogDoc(loja([{ name: 'X' }]));
    expect(html).toContain('Sem código');
  });
});
