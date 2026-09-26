// "Criar pedido desta conversa": o wizard abre com o que o bot já juntou.
import { renderHook, act } from '@testing-library/react';

const createOrder = jest.fn();
jest.mock('../../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: jest.fn(), createOrder: (...a: unknown[]) => createOrder(...a) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../../services/api', () => ({ __esModule: true, getErrorMessage: () => 'Erro' }));

import { useNewOrderWizard } from '../useNewOrderWizard';
import type { RascunhoDePedido } from '../rascunhoDaConversa';

const RASCUNHO: RascunhoDePedido = {
  cliente: { nome: 'Maria', telefone: '5563999990000' },
  entrega: 'delivery',
  endereco: 'Rua 1, 100',
  itens: [{ product: { id: 'p1', name: 'Salada', price: 30 } as never, quantity: 2 }],
  observacoes: 'sem cebola',
  naoAchados: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  createOrder.mockResolvedValue({ order_number: '#1' });
});

test('aplicar o rascunho preenche cliente, endereço, itens e observações', () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  act(() => { result.current.aplicarRascunho(RASCUNHO); });
  expect(result.current.customer).toMatchObject({ id: '', name: 'Maria', phone_number: '5563999990000' });
  expect(result.current.deliveryMethod).toBe('delivery');
  expect(result.current.freeAddressText).toBe('Rua 1, 100');
  // Sem cotação: o frete ainda precisa ser calculado — a mesma trava do pedido da Ana Paula.
  expect(result.current.routeQuote).toBeNull();
  expect(result.current.cart).toEqual(RASCUNHO.itens);
  expect(result.current.observacoes).toBe('sem cebola');
  expect(result.current.step).toBe(0);
});

test('as observações vão no pedido, junto do Fiado quando for o caso', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  act(() => {
    result.current.aplicarRascunho({ ...RASCUNHO, entrega: 'pickup' });
    result.current.setPaymentMethod('fiado');
  });
  await act(async () => { await result.current.handleSubmit(); });
  expect(createOrder.mock.calls[0][0].notes).toBe('Fiado\nsem cebola');
});

test('sem observação, notes continua como antes', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  act(() => { result.current.aplicarRascunho({ ...RASCUNHO, entrega: 'pickup', observacoes: '' }); });
  await act(async () => { await result.current.handleSubmit(); });
  expect(createOrder.mock.calls[0][0].notes).toBeUndefined();
});

test('reset limpa as observações', () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  act(() => { result.current.aplicarRascunho(RASCUNHO); });
  act(() => { result.current.reset(); });
  expect(result.current.observacoes).toBe('');
});
