/**
 * Troco na comanda do PAINEL. O print-agent (escpos.js) imprime o mesmo: são
 * dois caminhos de impressão que não se falam, e o entregador precisa ler o
 * mesmo "TROCO PARA / LEVAR" nos dois papéis.
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
  id: 't-1', order_number: 'CE-2609140001', customer_name: 'Ana',
  customer_phone: '5563999999999', status: 'preparing', delivery_method: 'delivery',
  created_at: '2026-09-14T12:00:00Z', subtotal: '35.00', total: '35.00',
  payment_method: 'cash', payment_status: 'pending', items: [],
};

describe('OrderPrint — troco', () => {
  it('troco para 100: imprime quanto levar', () => {
    const html = capturarComanda({ ...base, change_for: '100.00', change_due: '65.00' });
    expect(html).toContain('TROCO PARA R$ 100,00');
    expect(html).toContain('LEVAR R$ 65,00');
  });

  it('cliente disse que não precisa', () => {
    const html = capturarComanda({ ...base, change_for: '0.00', change_due: '0.00' });
    expect(html).toContain('SEM TROCO');
  });

  it('ninguém perguntou: nada de troco no papel', () => {
    const html = capturarComanda({ ...base, change_for: null });
    expect(html).not.toMatch(/TROCO/);
  });
});
