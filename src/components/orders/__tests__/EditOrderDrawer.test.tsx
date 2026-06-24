// src/components/orders/__tests__/EditOrderDrawer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditOrderDrawer } from '../EditOrderDrawer';
import { ordersService } from '../../../services/orders';

jest.mock('../../../services/orders', () => ({
  ordersService: { updateOrder: jest.fn().mockResolvedValue({ id: 'o1' }) },
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
