/**
 * O papel que sai do painel precisa dizer o que a cozinha monta.
 *
 * Existem dois caminhos de impressão e eles não se falam: o print-agent
 * (automático, nos PCs das lojas) e o botão "Imprimir" do painel, que monta o
 * HTML no navegador. O backend calcula o preparo em `linhas_de_preparo` e
 * entrega em `prep`; sem este render, a comanda do painel continua dizendo só
 * "2x MINI HAMBÚRGUER" enquanto a do agente diz "100 UNIDADES".
 *
 * Caso real: pedido IVO2608180318 (Fabiana chater, Ivoneth Banqueteria).
 */
import { renderHook } from '@testing-library/react';
import { useOrderPrint } from '../OrderPrint';

/** Captura o HTML que o hook escreveria no iframe de impressão. */
function capturarComanda(pedido: any, options?: any): string {
  let html = '';
  const escrito: string[] = [];
  const fakeDoc = {
    open: () => {},
    write: (t: string) => escrito.push(t),
    close: () => {},
  };
  const realCreate = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = realCreate(tag);
    if (tag === 'iframe') {
      Object.defineProperty(el, 'contentWindow', {
        value: { document: fakeDoc, focus: () => {}, print: () => {} },
        configurable: true,
      });
      Object.defineProperty(el, 'contentDocument', { value: fakeDoc, configurable: true });
    }
    return el;
  });

  const { result } = renderHook(() => useOrderPrint());
  result.current.printOrder(pedido, options);
  html = escrito.join('');
  (document.createElement as jest.Mock).mockRestore();
  return html;
}

const pedido = {
  id: 'ivo-1',
  order_number: 'IVO2608180318',
  customer_name: 'Fabiana chater',
  customer_phone: '5563999999999',
  status: 'confirmed',
  delivery_method: 'delivery',
  created_at: '2026-08-18T14:30:31Z',
  subtotal: '2341.33',
  total: '2341.33',
  items: [
    {
      id: 'i1',
      product_name: 'Mini Hambúrguer',
      quantity: 2,
      unit_price: '215.00',
      total_price: 430,
      prep: ['>> 100 UNIDADES (2 x 50)'],
    },
    {
      id: 'i2',
      product_name: 'trio entradas 20 pessoas',
      quantity: 1,
      unit_price: '457.00',
      total_price: 457,
      notes: 'Terrine gorgonzola',
      prep: ['- 1 terrine gorgonzola', '- 1 terrine de frango', '- 1 kibe cru rcheado'],
    },
  ],
  combo_items: [],
};

const PREPARO = { preparo: true, hidePrices: true };

describe('comanda de PREPARO', () => {
  it('imprime o rendimento já multiplicado', () => {
    expect(capturarComanda(pedido, PREPARO)).toContain('&gt;&gt; 100 UNIDADES (2 x 50)');
  });

  it('imprime a composição do item, linha a linha', () => {
    const html = capturarComanda(pedido, PREPARO);
    expect(html).toContain('1 terrine gorgonzola');
    expect(html).toContain('1 terrine de frango');
    expect(html).toContain('1 kibe cru rcheado');
  });

  it('destaca o rendimento e não a composição', () => {
    const html = capturarComanda(pedido, PREPARO);
    expect(html).toContain('class="preparo-total"');
    expect(html).toContain('class="preparo"');
  });

  it('se anuncia como via de montagem, para ninguém confundir com a do entregador', () => {
    const html = capturarComanda(pedido, PREPARO);
    expect(html).toContain('PREPARO');
    expect(html).toContain('VIA DE MONTAGEM');
  });

  it('item sem preparo não ganha bloco vazio', () => {
    const semPrep = { ...pedido, items: [{ ...pedido.items[0], prep: [] }] };
    expect(capturarComanda(semPrep, PREPARO)).not.toContain('class="preparo-total"');
  });

  it('pedido antigo, sem o campo prep, não quebra a impressão', () => {
    const antigo = { ...pedido, items: [{ id: 'x', product_name: 'Salada', quantity: 1, unit_price: '30.00', total_price: 30 }] };
    // O maiúsculo vem do CSS (`text-transform`), não do HTML.
    expect(capturarComanda(antigo, PREPARO)).toContain('Salada');
  });
});

describe('as OUTRAS comandas não mudam', () => {
  /**
   * A composição de uma Tábua de Frios são dez linhas. Somada à comanda de
   * entrega, ela empurra o papel para fora da bobina e afoga o endereço —
   * que é a única coisa que o entregador precisa ler. Quem monta e quem
   * entrega leem papéis diferentes.
   */
  it('a comanda completa não ganha preparo', () => {
    const html = capturarComanda(pedido);
    expect(html).not.toContain('class="preparo-total"');
    expect(html).not.toContain('100 UNIDADES');
  });

  it('a comanda da cozinha (sem preços) também não', () => {
    const html = capturarComanda(pedido, { hidePrices: true });
    expect(html).not.toContain('class="preparo-total"');
    expect(html).toContain('VIA DA COZINHA');
  });

  it('a comanda completa continua anunciando o modo de entrega', () => {
    expect(capturarComanda(pedido)).not.toContain('VIA DE MONTAGEM');
  });
});
