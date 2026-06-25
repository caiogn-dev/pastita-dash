// src/components/orders/__tests__/EditOrderDrawer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditOrderDrawer } from '../EditOrderDrawer';
import { ordersService } from '../../../services/orders';

jest.mock('../../../services/orders', () => ({
  ordersService: {
    updateOrder: jest.fn().mockResolvedValue({ id: 'o1' }),
    adjustOrder: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock('../../../services/products', () => ({
  productsService: {
    getProducts: jest.fn().mockResolvedValue({
      results: [{ id: 'prod-9', name: 'Suco', price: 7 }],
    }),
  },
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const baseOrder = { id: 'o1', customer_name: 'Antigo', customer_phone: '63999990000', store: 'loja-1' } as never;

test('salva apenas campos alterados via updateOrder', async () => {
  const onSaved = jest.fn();
  render(<EditOrderDrawer order={baseOrder} onClose={jest.fn()} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Novo Nome' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(ordersService.updateOrder).toHaveBeenCalledWith(
    'o1', expect.objectContaining({ customer_name: 'Novo Nome' })
  ));
  expect(onSaved).toHaveBeenCalled();
});

test('nao fecha em erro de salvar', async () => {
  (ordersService.updateOrder as jest.Mock).mockRejectedValueOnce(new Error('x'));
  const onClose = jest.fn();
  render(<EditOrderDrawer order={baseOrder} onClose={onClose} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Z' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(ordersService.updateOrder).toHaveBeenCalled());
  expect(onClose).not.toHaveBeenCalled();
});

test('habilitar agendamento com apenas horario (sem data) nao envia campos de agendamento', async () => {
  (ordersService.updateOrder as jest.Mock).mockClear();
  const onSaved = jest.fn();
  render(<EditOrderDrawer order={baseOrder} onClose={jest.fn()} onSaved={onSaved} />);
  // Enable scheduling
  fireEvent.click(screen.getByRole('checkbox'));
  // Pick only a time slot, leave date empty
  fireEvent.click(screen.getByText('10:00-12:00'));
  // Also change name so patch is non-empty (otherwise drawer no-ops with onClose)
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Outro Nome' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(ordersService.updateOrder).toHaveBeenCalled());
  const patch = (ordersService.updateOrder as jest.Mock).mock.calls[0][1];
  expect(patch).not.toHaveProperty('scheduled_date');
  expect(patch).not.toHaveProperty('scheduled_time');
});

// Task 7: discount / surcharge / delivery-fee editing
const moneyOrder = {
  id: 'ord-1', customer_name: 'Maria', customer_phone: '6300', customer_notes: '',
  discount: 0, surcharge_value: 0, surcharge_reason: '', delivery_fee: 0,
  manual_discount_reason: '', items: [], subtotal: 20, total: 20,
} as unknown as import('../../../types').Order;

it('envia adjustOrder com desconto e acréscimo alterados', async () => {
  (ordersService.adjustOrder as jest.Mock).mockClear();
  render(<EditOrderDrawer order={moneyOrder} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/desconto/i), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText(/acréscimo/i), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(ordersService.adjustOrder).toHaveBeenCalledWith(
    'ord-1', expect.objectContaining({ discount: 5, surcharge_value: 3 }), undefined,
  ));
});

it('não chama adjustOrder quando dinheiro não mudou', async () => {
  (ordersService.adjustOrder as jest.Mock).mockClear();
  render(<EditOrderDrawer order={moneyOrder} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(ordersService.adjustOrder).not.toHaveBeenCalled());
});

// Task 8: item ops (quantity change + remove)
it('envia item_ops ao mudar quantidade e remover item', async () => {
  (ordersService.adjustOrder as jest.Mock).mockClear();
  const order = {
    ...moneyOrder,
    items: [
      { id: 'it-1', product: 'p1', product_name: 'X', quantity: 1, unit_price: 10, subtotal: 10 },
      { id: 'it-2', product: 'p2', product_name: 'Y', quantity: 1, unit_price: 5, subtotal: 5 },
    ],
  } as unknown as import('../../../types').Order;
  render(<EditOrderDrawer order={order} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /aumentar X/i }));   // qty de it-1 → 2
  fireEvent.click(screen.getByRole('button', { name: /remover Y/i }));    // remove it-2
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => {
    const call = (ordersService.adjustOrder as jest.Mock).mock.calls[0][1];
    expect(call.item_ops).toEqual(expect.arrayContaining([
      { op: 'update', item_id: 'it-1', quantity: 2 },
      { op: 'remove', item_id: 'it-2' },
    ]));
  });
});

// Task 8 (add-picker + qty): adicionar produto com quantidade personalizada
it('envia item_ops com quantidade personalizada ao adicionar produto', async () => {
  (ordersService.adjustOrder as jest.Mock).mockClear();
  const orderWithStore = {
    ...moneyOrder,
    store: 'store-1',
    items: [
      { id: 'it-1', product: 'p1', product_name: 'X', quantity: 1, unit_price: 10, subtotal: 10 },
    ],
  } as unknown as import('../../../types').Order;
  render(<EditOrderDrawer order={orderWithStore} onClose={jest.fn()} onSaved={jest.fn()} />);
  // Wait for the product option to appear in the select
  await screen.findByRole('option', { name: /suco/i });
  // Set quantity to 3
  fireEvent.change(screen.getByLabelText(/quantidade do novo item/i), { target: { value: '3' } });
  // Select the product
  fireEvent.change(screen.getByRole('combobox', { name: /adicionar produto/i }), {
    target: { value: 'prod-9' },
  });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => {
    const call = (ordersService.adjustOrder as jest.Mock).mock.calls[0][1];
    expect(call.item_ops).toEqual(
      expect.arrayContaining([
        { op: 'add', product_id: 'prod-9', quantity: 3 },
      ]),
    );
  });
});

// Task 8 (add-picker): adicionar produto pelo seletor
it('envia item_ops com op add ao selecionar produto no seletor', async () => {
  (ordersService.adjustOrder as jest.Mock).mockClear();
  const orderWithStore = {
    ...moneyOrder,
    store: 'store-1',
    items: [
      { id: 'it-1', product: 'p1', product_name: 'X', quantity: 1, unit_price: 10, subtotal: 10 },
    ],
  } as unknown as import('../../../types').Order;
  render(<EditOrderDrawer order={orderWithStore} onClose={jest.fn()} onSaved={jest.fn()} />);
  // Wait for the product option to appear in the select
  const option = await screen.findByRole('option', { name: /suco/i });
  expect(option).toBeInTheDocument();
  // Select the product
  fireEvent.change(screen.getByRole('combobox', { name: /adicionar produto/i }), {
    target: { value: 'prod-9' },
  });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => {
    const call = (ordersService.adjustOrder as jest.Mock).mock.calls[0][1];
    expect(call.item_ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'add', product_id: 'prod-9', quantity: 1 }),
      ]),
    );
  });
});
