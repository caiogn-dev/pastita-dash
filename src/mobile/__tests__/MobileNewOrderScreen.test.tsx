// src/mobile/__tests__/MobileNewOrderScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const createOrder = jest.fn();
const getProducts = jest.fn();

jest.mock('../../services', () => ({
  ordersService: { createOrder: (...a: unknown[]) => createOrder(...a) },
  productsService: { getProducts: (...a: unknown[]) => getProducts(...a) },
}));

import { useRootStore } from '../../stores/rootStore';
import { MobileNewOrderScreen } from '../screens/MobileNewOrderScreen';

beforeEach(() => {
  createOrder.mockResolvedValue({ id: 'o9', order_number: '#1009' });
  getProducts.mockResolvedValue({ results: [{ id: 'p1', name: 'X-Salada', price: 20 }] });
  useRootStore.setState({ selectedStoreId: 's1' } as never);
});

test('creates an order with the entered customer and a product', async () => {
  render(<MobileNewOrderScreen />);
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '63999990000' } });
  fireEvent.click(await screen.findByRole('button', { name: /x-salada/i }));
  fireEvent.click(screen.getByRole('button', { name: /finalizar pedido/i }));
  await waitFor(() => expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
    store: 's1', customer_name: 'Ana', customer_phone: '63999990000',
    items: [{ product_id: 'p1', quantity: 1 }],
  })));
});
