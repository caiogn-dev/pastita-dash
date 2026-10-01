// Formas de pagamento do "Novo pedido" (pedido lançado pelo atendente).
import { renderHook, act } from '@testing-library/react';
import { PAYMENT_LABELS } from '../types';
import { rotuloDePagamento } from '../../../../utils/rotulosDeEstado';

const calculateDeliveryFee = jest.fn();
const createOrder = jest.fn();
jest.mock('../../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: (...a: unknown[]) => calculateDeliveryFee(...a), createOrder: (...a: unknown[]) => createOrder(...a) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../../services/api', () => ({ __esModule: true, getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : 'Erro') }));

import { useNewOrderWizard } from '../useNewOrderWizard';

beforeEach(() => {
  jest.clearAllMocks();
  calculateDeliveryFee.mockResolvedValue({ fee: 0, distance_km: 0, duration_minutes: 0 });
  createOrder.mockResolvedValue({ order_number: '#1011' });
});

describe('opções do Novo pedido', () => {
  it('oferece PIX, Dinheiro, Cartão na maquininha e Fiado, nessa ordem', () => {
    expect(Object.keys(PAYMENT_LABELS)).toEqual(['pix', 'cash', 'card_on_delivery', 'fiado']);
  });

  it('o nome de cada forma real vem do mapa único', () => {
    expect(PAYMENT_LABELS.pix).toBe(rotuloDePagamento('pix'));
    expect(PAYMENT_LABELS.cash).toBe(rotuloDePagamento('cash'));
    expect(PAYMENT_LABELS.card_on_delivery).toBe('Cartão na maquininha');
    expect(PAYMENT_LABELS.fiado).toBe('Fiado');
  });

  it('nunca chama de "Cartão" um crédito que ninguém passou', () => {
    // Antes o botão "Cartão" mandava `credit_card`: o caixa lia crédito
    // recebido num pedido que ia ser pago na maquininha do entregador.
    expect(Object.keys(PAYMENT_LABELS)).not.toContain('credit_card');
  });
});

function setupBase(result: { current: ReturnType<typeof useNewOrderWizard> }) {
  act(() => {
    result.current.setCustomer({ id: 'c1', name: 'Maria', phone_number: '63999990000' } as never);
    result.current.setDeliveryMethod('pickup');
    result.current.addToCart({ id: 'p1', price: 1000, name: 'X' } as never);
  });
}

test('Cartão na maquininha vai para o backend como card_on_delivery', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  setupBase(result);
  act(() => { result.current.setPaymentMethod('card_on_delivery'); });
  await act(async () => { await result.current.handleSubmit(); });
  expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({ payment_method: 'card_on_delivery' }));
});

test('Fiado continua indo como dinheiro com a nota "Fiado"', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  setupBase(result);
  act(() => { result.current.setPaymentMethod('fiado'); });
  await act(async () => { await result.current.handleSubmit(); });
  const arg = createOrder.mock.calls[0][0];
  expect(arg.payment_method).toBe('cash');
  expect(arg.notes).toContain('Fiado');
});
