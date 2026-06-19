import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const feed = { orders: [] as unknown[], loading: false, error: null as string | null, refetch: jest.fn() };
jest.mock('../MobileOrdersContext', () => ({ useMobileOrders: () => feed }));
const updateOrderStatus = jest.fn();
jest.mock('../../services/storesApi', () => ({ updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a) }));
jest.mock('../PushOptInBanner', () => ({ PushOptInBanner: () => null }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));

import { MobileOrdersScreen } from '../screens/MobileOrdersScreen';

const ORDER = { id: 'o1', order_number: '#1001', status: 'pending', customer_name: 'Ana', total: 42.5, items: [{ id: 'i', product_name: 'X', quantity: 1, unit_price: 42.5, subtotal: 42.5, notes: '' }], created_at: '2026-06-19T12:00:00Z' };

beforeEach(() => {
  feed.orders = [ORDER]; feed.loading = false; feed.error = null;
  updateOrderStatus.mockResolvedValue({ order_number: '#1001', status: 'confirmed' });
});

test('renders order cards with number and customer', () => {
  render(<MobileOrdersScreen />);
  expect(screen.getByText('#1001')).toBeInTheDocument();
  expect(screen.getByText('Ana')).toBeInTheDocument();
});

test('shows skeleton while loading and empty state when no orders', () => {
  feed.orders = []; feed.loading = true;
  const { rerender } = render(<MobileOrdersScreen />);
  expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
  feed.loading = false;
  rerender(<MobileOrdersScreen />);
  expect(screen.getByText(/nenhum pedido ativo/i)).toBeInTheDocument();
});

test('shows error with retry that calls refetch', () => {
  feed.orders = []; feed.error = 'boom';
  render(<MobileOrdersScreen />);
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(feed.refetch).toHaveBeenCalled();
});

test('excludes terminal orders from the live list', () => {
  feed.orders = [{ ...ORDER, id: 'o2', order_number: '#DELIV', status: 'delivered' }];
  render(<MobileOrdersScreen />);
  expect(screen.queryByText('#DELIV')).not.toBeInTheDocument();
  expect(screen.getByText(/nenhum pedido ativo/i)).toBeInTheDocument();
});

test('tapping a card opens the detail sheet', () => {
  render(<MobileOrdersScreen />);
  fireEvent.click(screen.getByText('#1001'));
  expect(screen.getByText(/Pedido #1001/)).toBeInTheDocument();
});
