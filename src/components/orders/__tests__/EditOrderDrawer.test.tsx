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
