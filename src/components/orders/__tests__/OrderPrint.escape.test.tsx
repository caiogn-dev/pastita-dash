/**
 * A comanda é escrita num iframe do mesmo domínio do painel: HTML vindo da API
 * sem escape roda com acesso ao token. Forma de pagamento/status desconhecidos
 * caem num texto cru, então precisam sair escapados.
 */
import { renderHook } from '@testing-library/react';
import { useOrderPrint } from '../OrderPrint';

/** Captura o HTML que o hook escreveria no iframe de impressão. */
function capturarComanda(pedido: Record<string, unknown>, options?: Record<string, unknown>): string {
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

describe('OrderPrint — escape de HTML', () => {
  it('forma de pagamento desconhecida não vira tag na comanda', () => {
    const html = capturarComanda({ ...base, payment_method: '<img src=x onerror=alert(1)>' });
    expect(html).not.toMatch(/<img src=x/i);
    expect(html).toContain('&lt;IMG SRC=X');
  });

  it('status de pagamento desconhecido não vira tag na comanda', () => {
    const html = capturarComanda({ ...base, payment_status: '<script>alert(1)</script>' });
    expect(html).not.toMatch(/<script>alert/i);
    expect(html).toContain('&lt;SCRIPT&gt;');
  });

  it('valores conhecidos continuam legíveis', () => {
    const html = capturarComanda({ ...base, payment_status: 'paid', payment_method: 'pix' });
    expect(html).toContain('PIX - PAGO');
  });
});
