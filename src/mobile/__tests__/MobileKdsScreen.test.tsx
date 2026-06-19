import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const feed = { orders: [] as unknown[], loading: false, error: null as string | null, refetch: jest.fn() };
jest.mock('../MobileOrdersContext', () => ({ useMobileOrders: () => feed }));
const updateOrderStatus = jest.fn();
jest.mock('../../services/storesApi', () => ({ updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));

import { MobileKdsScreen } from '../screens/MobileKdsScreen';

const ORDER = { id: 'o1', order_number: '#1001', status: 'preparing', customer_name: 'Ana', delivery_method: 'pickup', delivery_method_display: 'Retirada', customer_notes: '', items: [{ id: 'i', product_name: 'X-Salada', quantity: 2, unit_price: 1, subtotal: 2, notes: '' }], created_at: '2026-06-19T12:00:00Z', total: 2 };

beforeEach(() => { feed.orders = [ORDER]; feed.loading = false; feed.error = null; updateOrderStatus.mockResolvedValue({ status: 'ready' }); });

test('lists the items of each order (not just a count)', () => {
  render(<MobileKdsScreen />);
  expect(screen.getByText(/2× X-Salada/)).toBeInTheDocument();
  expect(screen.getByText('Ana')).toBeInTheDocument();
});

test('advances a preparing order to ready', async () => {
  render(<MobileKdsScreen />);
  fireEvent.click(screen.getByRole('button', { name: /pronto/i }));
  await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'ready'));
});

test('shows empty state when kitchen has no orders', () => {
  feed.orders = [];
  render(<MobileKdsScreen />);
  expect(screen.getByText(/cozinha vazia/i)).toBeInTheDocument();
});
