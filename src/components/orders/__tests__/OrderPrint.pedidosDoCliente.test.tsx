/**
 * Qual pedido do cliente é este, no papel. 22/10, dono: "ao imprimir pelo
 * painel aparece ok, menos o número de pedidos". O detalhe já trazia
 * `pedidos_do_cliente`; a comanda não usava. Mesmo texto do print agent.
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

const base = {
  id: 't-1', order_number: 'CE-2610225590', customer_name: 'Ricardo Garcia',
  customer_phone: '5563999999999', status: 'preparing', delivery_method: 'delivery',
  created_at: '2026-10-22T11:28:00Z', subtotal: '70.98', total: '73.44', discount: '7.10',
  payment_method: 'pix', payment_status: 'paid', items: [],
};

describe('OrderPrint — pedidos do cliente', () => {
  it('cliente que volta sai com o número do pedido', () => {
    expect(capturarComanda({ ...base, pedidos_do_cliente: 3 })).toContain('3º PEDIDO');
  });

  it('primeiro pedido avisa cliente novo', () => {
    expect(capturarComanda({ ...base, pedidos_do_cliente: 1 })).toContain('1º PEDIDO - CLIENTE NOVO');
  });

  it('sem a contagem (listagem, sem telefone): nada', () => {
    const html = capturarComanda({ ...base, pedidos_do_cliente: null });
    expect(html).not.toMatch(/º PEDIDO/);
    expect(capturarComanda({ ...base, pedidos_do_cliente: 0 })).not.toMatch(/º PEDIDO/);
  });

  it('cupom com código e sem a lista de descontos: o código não some', () => {
    const html = capturarComanda({ ...base, coupon_code: 'BEMVINDO10', descontos: [] });
    expect(html).toContain('Cupom BEMVINDO10');
  });
});
