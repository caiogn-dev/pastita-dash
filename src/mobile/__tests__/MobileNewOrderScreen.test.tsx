import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const createOrder = jest.fn();
const getProducts = jest.fn();
jest.mock('../../services', () => ({
  ordersService: { createOrder: (...a: unknown[]) => createOrder(...a) },
  productsService: { getProducts: (...a: unknown[]) => getProducts(...a) },
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { useRootStore } from '../../stores/rootStore';
import { MobileNewOrderScreen } from '../screens/MobileNewOrderScreen';

beforeEach(() => {
  createOrder.mockResolvedValue({ id: 'o9', order_number: '#1009' });
  getProducts.mockResolvedValue({ results: [{ id: 'p1', name: 'X-Salada', price: 20 }] });
  useRootStore.setState({ selectedStoreId: 's1' } as never);
});

test('adds a product, shows total, and creates a pickup/cash order', async () => {
  render(<MobileNewOrderScreen />);
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '6399' } });
  fireEvent.click(await screen.findByRole('button', { name: /x-salada/i }));
  expect(screen.getByText(/R\$\s?20,00/)).toBeInTheDocument(); // total line
  fireEvent.click(screen.getByRole('button', { name: /finalizar pedido/i }));
  await waitFor(() => expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
    store: 's1', customer_name: 'Ana', customer_phone: '6399',
    delivery_method: 'pickup', payment_method: 'cash',
    items: [{ product_id: 'p1', quantity: 1 }],
  })));
});

test('increments and removes cart items', async () => {
  render(<MobileNewOrderScreen />);
  fireEvent.click(await screen.findByRole('button', { name: /x-salada/i }));
  fireEvent.click(screen.getByRole('button', { name: /aumentar/i }));
  expect(screen.getByText('x2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /remover/i }));
  expect(screen.queryByText(/no pedido/i)).not.toBeInTheDocument();
});

test('shows empty-products message when none returned', async () => {
  getProducts.mockResolvedValue({ results: [] });
  render(<MobileNewOrderScreen />);
  expect(await screen.findByText(/nenhum produto ativo/i)).toBeInTheDocument();
});
