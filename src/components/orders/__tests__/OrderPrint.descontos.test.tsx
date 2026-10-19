/**
 * De onde veio o desconto, no papel. 19/10, dono: "não consigo ver qual cupom
 * foi utilizado pelo cliente na comanda", e o resgate da fidelidade saía só
 * como "Desconto". O backend manda `descontos` (services/descontos_do_pedido.py).
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
  id: 't-1', order_number: 'CE-2610192528', customer_name: 'Wanny',
  customer_phone: '5563999999999', status: 'preparing', delivery_method: 'pickup',
  created_at: '2026-10-19T13:20:00Z', subtotal: '52.90', total: '0.00', discount: '52.90',
  payment_method: 'sem_cobranca', payment_status: 'paid', items: [],
};

describe('OrderPrint — descontos', () => {
  it('cupom sai com o código', () => {
    const html = capturarComanda({
      ...base, total: '47.61', discount: '5.29',
      descontos: [{ tipo: 'cupom', rotulo: 'Cupom BEMVINDO10', valor: '5.29', codigo: 'BEMVINDO10' }],
    });
    expect(html).toContain('Cupom BEMVINDO10');
    expect(html).toMatch(/-\s*R\$\s*5,29/);
  });

  it('resgate diz qual item saiu grátis', () => {
    const html = capturarComanda({
      ...base,
      descontos: [{ tipo: 'fidelidade', rotulo: 'Resgate fidelidade', valor: '52.90', item: 'Salmão Sublime' }],
    });
    expect(html).toContain('Resgate fidelidade: Salmão Sublime');
    expect(html).not.toMatch(/<span>Desconto<\/span>/);
  });

  it('pedido antigo sem a lista: segue "Desconto" com o total', () => {
    const html = capturarComanda({ ...base });
    expect(html).toMatch(/<span>Desconto<\/span>/);
  });

  it('pedido sem cobrança mostra o rótulo, não o código', () => {
    const html = capturarComanda({ ...base });
    expect(html).toContain('SEM COBRANÇA (GRÁTIS)');
  });
});
