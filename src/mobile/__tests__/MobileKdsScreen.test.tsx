// src/mobile/__tests__/MobileKdsScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../../hooks/useRealTimeOrders', () => ({ useRealTimeOrders: () => ({ isConnected: true }) }));
const getOrders = jest.fn();
const updateOrderStatus = jest.fn();
jest.mock('../../services/storesApi', () => ({
  getOrders: (...a: unknown[]) => getOrders(...a),
  updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a),
}));

import { useRootStore } from '../../stores/rootStore';
import { MobileKdsScreen } from '../screens/MobileKdsScreen';

const ORDER = {
  id: 'o1', order_number: '#1001', customer_name: 'Ana', total: 10,
  status: 'preparing', items: [], created_at: '2026-06-19T12:00:00Z',
};

beforeEach(() => {
  getOrders.mockResolvedValue({ results: [ORDER] });
  updateOrderStatus.mockResolvedValue({ ...ORDER, status: 'ready' });
  useRootStore.setState({ selectedStoreId: 's1', orders: { s1: [ORDER] } } as never);
});

test('advances a preparing order to ready', async () => {
  render(<MobileKdsScreen />);
  fireEvent.click(await screen.findByRole('button', { name: /pronto/i }));
  await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'ready'));
});
