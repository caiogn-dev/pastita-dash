/**
 * "Criar pedido desta conversa": o botão do cabeçalho lê o carrinho do bot e
 * abre o Novo Pedido já preenchido, via state da navegação.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import WhatsAppInboxPage from '../WhatsAppInboxPage';
import { useChatStore } from '../../../stores/chatStore';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
const toastFn = jest.requireMock('react-hot-toast').default as jest.Mock & { error: jest.Mock };
jest.mock('../../../services', () => ({ __esModule: true, getErrorMessage: (e: unknown) => String(e) }));
jest.mock('../../../services/whatsapp', () => ({ __esModule: true, sendMessage: jest.fn() }));
jest.mock('../../../services/handover', () => ({
  __esModule: true, handoverService: { transferToHuman: jest.fn(), transferToBot: jest.fn() },
}));
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'uuid-1', storeSlug: 'loja-1', storeName: 'Loja', store: null }),
}));
jest.mock('../../../context/WhatsAppWsContext', () => ({
  __esModule: true,
  useWhatsAppWsContext: () => ({
    isConnected: true, connectionError: null, subscribeToConversation: jest.fn(),
    unsubscribeFromConversation: jest.fn(), sendTypingIndicator: jest.fn(), reconnect: jest.fn(),
  }),
}));
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getConversations: jest.fn().mockResolvedValue({ results: [{
      id: 'conv-1', account: 'acc-1', phone_number: '5563999990000',
      contact_name: 'Maria Souza', mode: 'human', last_message_preview: '',
    }] }),
    getMessages: jest.fn().mockResolvedValue({ results: [] }),
  },
}));
jest.mock('../../../components/chat/ChatToolsPanel', () => ({ __esModule: true, ChatToolsPanel: () => null }));

const getContextoDoBot = jest.fn();
jest.mock('../../../services/atendimentoBot', () => ({
  __esModule: true,
  atendimentoBotService: { getContextoDoBot: (...a: unknown[]) => getContextoDoBot(...a) },
}));
const getProducts = jest.fn();
jest.mock('../../../services/products', () => ({
  __esModule: true,
  productsService: { getProducts: (...a: unknown[]) => getProducts(...a) },
}));

let chegou: { pathname: string; search: string; state: unknown } | null = null;
const Pedidos = () => {
  const l = useLocation();
  chegou = { pathname: l.pathname, search: l.search, state: l.state };
  return <p>tela de pedidos</p>;
};

const renderizar = () => render(
  <MemoryRouter initialEntries={['/inbox?conversation=conv-1']}>
    <Routes>
      <Route path="/inbox" element={<WhatsAppInboxPage />} />
      <Route path="/stores/:storeId/orders" element={<Pedidos />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  jest.clearAllMocks();
  chegou = null;
  useChatStore.getState().setConversations([]);
  getProducts.mockResolvedValue({ results: [{ id: 'p1', name: 'Salada Caesar', price: 30 }] });
});

it('abre o Novo Pedido com cliente, endereço, itens e observações do bot', async () => {
  getContextoDoBot.mockResolvedValue({
    carrinho: {
      itens: [{ nome: 'Salada Caesar', quantidade: 2, preco: 30 }, { nome: 'Pizza', quantidade: 1 }],
      endereco: 'Rua 1, 100', notas: 'sem cebola', entrega: 'delivery',
    },
    cliente: { nome: 'Maria Souza', telefone: '5563999990000', pedidos: 3 },
  });
  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /criar pedido/i }));
  await screen.findByText('tela de pedidos');

  expect(getContextoDoBot).toHaveBeenCalledWith('conv-1');
  expect(getProducts).toHaveBeenCalledWith(expect.objectContaining({ store: 'uuid-1' }));
  expect(chegou?.pathname).toBe('/stores/loja-1/orders');
  expect(chegou?.search).toBe('?novo=1');
  const r = (chegou?.state as { rascunhoDoPedido: Record<string, unknown> }).rascunhoDoPedido;
  expect(r.cliente).toEqual({ nome: 'Maria Souza', telefone: '5563999990000' });
  expect(r.endereco).toBe('Rua 1, 100');
  expect((r.itens as { product: { id: string }; quantity: number }[]).map((i) => [i.product.id, i.quantity])).toEqual([['p1', 2]]);
  expect(r.observacoes).toMatch(/sem cebola[\s\S]*1× Pizza/);
  // Item fora do cardápio é avisado, não some calado.
  expect(toastFn).toHaveBeenCalledWith(expect.stringMatching(/não foi achado/));
});

it('sem o contexto do bot, abre mesmo assim com o cliente da conversa', async () => {
  getContextoDoBot.mockRejectedValue(new Error('404'));
  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /criar pedido/i }));
  await screen.findByText('tela de pedidos');
  const r = (chegou?.state as { rascunhoDoPedido: Record<string, unknown> }).rascunhoDoPedido;
  expect(r.cliente).toEqual({ nome: 'Maria Souza', telefone: '5563999990000' });
  await waitFor(() => expect(toastFn.error).toHaveBeenCalled());
});
