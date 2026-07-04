import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import type { Order } from '../../../types';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockGetOrder = jest.fn();
const mockGetByOrder = jest.fn();
jest.mock('../../../services', () => ({
  __esModule: true,
  ordersService: {
    getOrder: (...a: unknown[]) => mockGetOrder(...a),
    generatePayment: jest.fn(),
    updateStatus: jest.fn(),
  },
  paymentsService: { getByOrder: (...a: unknown[]) => mockGetByOrder(...a) },
  getErrorMessage: (e: unknown) => String(e),
}));

// Mocka o barrel de hooks (evita carregar import.meta transitivo do useWebSocket).
// OrderDetailContent importa useStore daqui; OrderDetailModal importa o
// useOrderDetailModal REAL pelo path direto, então ele não é afetado por este mock.
jest.mock('../../../hooks', () => ({
  __esModule: true,
  useStore: () => ({ store: { id: 'loja-1', name: 'Loja Teste', slug: 'loja-1' }, stores: [] }),
}));

jest.mock('../OrderPrint', () => ({ __esModule: true, useOrderPrint: () => ({ printOrder: jest.fn() }) }));
jest.mock('../../OrderDeliveryModal', () => ({ __esModule: true, OrderDeliveryModal: () => null }));
jest.mock('../EditOrderDrawer', () => ({ __esModule: true, EditOrderDrawer: () => null }));

import { OrderDetailModal } from '../OrderDetailModal';

const baseOrder: Order = {
  id: 'o1',
  order_number: '1001',
  store: 'loja-1',
  customer_name: 'Maria Souza',
  customer_phone: '63999990000',
  items: [],
  subtotal: 50,
  tax: 0,
  delivery_fee: 0,
  discount: 0,
  total: 50,
  status: 'confirmed',
  payment_status: 'pending',
  created_at: '2026-06-25T12:00:00Z',
  updated_at: '2026-06-25T12:00:00Z',
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OrderDetailModal />
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockGetByOrder.mockResolvedValue([]);
  mockGetOrder.mockResolvedValue(baseOrder);
});

describe('OrderDetailModal — abertura via ?pedido=', () => {
  it('NÃO renderiza o detalhe quando não há ?pedido', () => {
    renderAt('/stores/loja-1/orders');
    expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
    expect(mockGetOrder).not.toHaveBeenCalled();
  });

  it('renderiza o detalhe do pedido quando ?pedido=<id> está na URL', async () => {
    renderAt('/stores/loja-1/orders?pedido=o1');
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
    expect(mockGetOrder).toHaveBeenCalledWith('o1');
  });

  it('fecha ao clicar no botão de fechar (remove o ?pedido)', async () => {
    renderAt('/stores/loja-1/orders?pedido=o1');
    await screen.findByText('Maria Souza');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument());
  });

  it('fecha com a tecla Escape', async () => {
    renderAt('/stores/loja-1/orders?pedido=o1');
    await screen.findByText('Maria Souza');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument());
  });

  // Regressão: Escape com um sub-modal (cancelar) aberto NÃO pode fechar o pedido inteiro.
  it('Escape com a confirmação de cancelar aberta fecha só a confirmação, mantém o pedido', async () => {
    renderAt('/stores/loja-1/orders?pedido=o1');
    await screen.findByText('Maria Souza');

    fireEvent.click(screen.getByText('Cancelar pedido'));
    expect(await screen.findByText(/Tem certeza que deseja cancelar/i)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByText(/Tem certeza que deseja cancelar/i)).not.toBeInTheDocument(),
    );
    // o pedido continua aberto — Escape não vazou pro modal externo
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
  });

  // Regressão: erro no load NÃO pode fechar o modal (antes chamava onClose →
  // ejetava o usuário). Agora mostra retry, e o retry recupera.
  it('em erro de load mostra retry sem fechar o modal; retry recupera', async () => {
    mockGetOrder.mockReset();
    mockGetOrder.mockRejectedValueOnce('falha de rede').mockResolvedValue(baseOrder);

    renderAt('/stores/loja-1/orders?pedido=o1');
    expect(await screen.findByText(/Não foi possível carregar o pedido/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Tentar novamente'));
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
  });

  // Regressão: fechar um sub-modal não pode destravar o scroll do body enquanto
  // o modal do pedido ainda está aberto (lock ref-contado).
  it('mantém o scroll do body travado ao abrir e fechar a confirmação de cancelar', async () => {
    renderAt('/stores/loja-1/orders?pedido=o1');
    await screen.findByText('Maria Souza');
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByText('Cancelar pedido'));
    await screen.findByText(/Tem certeza que deseja cancelar/i);
    fireEvent.click(screen.getByText('Voltar'));
    await waitFor(() =>
      expect(screen.queryByText(/Tem certeza que deseja cancelar/i)).not.toBeInTheDocument(),
    );

    expect(document.body.style.overflow).toBe('hidden');
  });
});
