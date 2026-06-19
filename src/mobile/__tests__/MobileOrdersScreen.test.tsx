// src/mobile/__tests__/MobileOrdersScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../hooks/useRealTimeOrders', () => ({ useRealTimeOrders: () => ({ isConnected: true }) }));
jest.mock('../PushOptInBanner', () => ({ PushOptInBanner: () => null }));

const getOrders = jest.fn();
const updateOrderStatus = jest.fn();
jest.mock('../../services/storesApi', () => ({
  getOrders: (...a: unknown[]) => getOrders(...a),
  updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a),
}));

import { useRootStore } from '../../stores/rootStore';
import { MobileOrdersScreen } from '../screens/MobileOrdersScreen';

const ORDER = {
  id: 'o1', order_number: '#1001', customer_name: 'Ana', total: 42.5,
  status: 'pending', items: [], created_at: '2026-06-19T12:00:00Z',
};

beforeEach(() => {
  getOrders.mockResolvedValue({ results: [ORDER] });
  updateOrderStatus.mockResolvedValue({ ...ORDER, status: 'confirmed' });
  useRootStore.setState({ selectedStoreId: 's1', orders: { s1: [ORDER] } } as never);
});

function renderScreen() {
  return render(<MemoryRouter><MobileOrdersScreen /></MemoryRouter>);
}

test('renders an order card for the active store', async () => {
  renderScreen();
  expect(await screen.findByText('#1001')).toBeInTheDocument();
  expect(screen.getByText('Ana')).toBeInTheDocument();
});

test('advances status when the CTA is tapped', async () => {
  renderScreen();
  fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }));
  await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'confirmed'));
});
