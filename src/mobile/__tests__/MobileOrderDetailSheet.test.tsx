import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const updateOrderStatus = jest.fn();
jest.mock('../../services/storesApi', () => ({ updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { MobileOrderDetailSheet } from '../MobileOrderDetailSheet';

const ORDER = {
  id: 'o1', order_number: '#1001', status: 'pending', status_display: 'Recebido',
  customer_name: 'Ana', customer_phone: '6399', total: 42.5, payment_method: 'cash',
  delivery_method: 'pickup', delivery_method_display: 'Retirada', delivery_address: {} as never,
  customer_notes: 'sem cebola', items: [{ id: 'i1', product_name: 'X-Salada', quantity: 2, unit_price: 20, subtotal: 40, notes: '' }],
  created_at: '2026-06-19T12:00:00Z',
} as never;

beforeEach(() => { updateOrderStatus.mockResolvedValue({ order_number: '#1001', status: 'confirmed' }); });

test('shows customer, items and advances status', async () => {
  const onAdvanced = jest.fn();
  render(<MobileOrderDetailSheet order={ORDER} onClose={() => {}} onAdvanced={onAdvanced} />);
  expect(screen.getByText('Ana')).toBeInTheDocument();
  expect(screen.getByText(/X-Salada/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
  await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'confirmed'));
  await waitFor(() => expect(onAdvanced).toHaveBeenCalled());
});

test('renders nothing when order is null', () => {
  const { container } = render(<MobileOrderDetailSheet order={null} onClose={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});
