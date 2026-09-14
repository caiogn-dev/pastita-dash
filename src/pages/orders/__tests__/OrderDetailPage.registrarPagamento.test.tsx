import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Order } from '../../../types';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: 'o1', storeId: 'loja-1' }),
  useNavigate: () => jest.fn(),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockGetOrder = jest.fn();
jest.mock('../../../services', () => ({
  __esModule: true,
  ordersService: {
    getOrder: (...a: unknown[]) => mockGetOrder(...a),
    generatePayment: jest.fn(),
    registrarPagamento: jest.fn(),
    updateStatus: jest.fn(),
  },
  paymentsService: { getByOrder: jest.fn().mockResolvedValue([]) },
  getErrorMessage: (e: unknown) => String(e),
}));
jest.mock('../../../hooks', () => ({
  __esModule: true,
  useStore: () => ({ store: { id: 'loja-1', name: 'Loja', slug: 'loja-1' }, stores: [] }),
}));
jest.mock('../../../components/orders/OrderPrint', () => ({
  __esModule: true,
  useOrderPrint: () => ({ printOrder: jest.fn() }),
}));
jest.mock('../../../components/OrderDeliveryModal', () => ({ __esModule: true, OrderDeliveryModal: () => null }));
jest.mock('../../../components/orders/EditOrderDrawer', () => ({ __esModule: true, EditOrderDrawer: () => null }));

import { OrderDetailPage } from '../OrderDetailPage';

const base: Order = {
  id: 'o1', order_number: 'CE-1', store: 'loja-1', customer_name: 'Leani', customer_phone: '63999990000',
  items: [], subtotal: 43.28, tax: 0, delivery_fee: 0, discount: 0, total: 43.28,
  status: 'pending', payment_status: 'processing',
  created_at: '2026-09-03T12:00:00Z', updated_at: '2026-09-03T12:00:00Z',
};

const texto = (s: string) => (_: string, el: Element | null) =>
  (el?.textContent ?? '').replace(/\s/g, ' ') === s && (el?.children.length ?? 0) === 0;

beforeEach(() => jest.clearAllMocks());

it('pago a menor ganha o selo "Pago R$ X de R$ Y — falta R$ Z"', async () => {
  mockGetOrder.mockResolvedValue({ ...base, amount_paid: 38.95, amount_due: 4.33, is_fully_paid: false });
  render(<OrderDetailPage />);
  expect(await screen.findByText(texto('Pago R$ 38,95 de R$ 43,28 — falta R$ 4,33'))).toBeInTheDocument();
});

it('falta receber oferece "Registrar pagamento" e abre o modal', async () => {
  mockGetOrder.mockResolvedValue({ ...base, payment_status: 'pending', amount_paid: 0, amount_due: 43.28 });
  render(<OrderDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento' }));
  expect(await screen.findByLabelText('Valor recebido')).toBeInTheDocument();
});

it('pedido quitado não oferece registrar', async () => {
  mockGetOrder.mockResolvedValue({ ...base, payment_status: 'paid', amount_paid: 0, amount_due: 0, is_fully_paid: true });
  render(<OrderDetailPage />);
  expect(await screen.findByText('Pago')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).not.toBeInTheDocument();
});
