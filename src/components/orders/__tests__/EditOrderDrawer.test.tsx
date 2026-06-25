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
