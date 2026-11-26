/**
 * O pin que o cliente mandou no WhatsApp aparece SOZINHO no novo pedido.
 *
 * Cliente da Cê (26/11) mandou a localização duas vezes, o operador
 * abriu o PDV, não achou — estava atrás de um botão só com ícone — e colou um
 * link do Maps. O pedido saiu com `{address: <link>}`, sem rua nem coordenada.
 * Escolher o cliente já busca o pin; um toque usa.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNewOrderWizard } from '../useNewOrderWizard';

const mockGetSharedLocation = jest.fn();
const mockCalculateDeliveryFee = jest.fn();
jest.mock('../../../../services/orders', () => ({
  ordersService: {
    getSharedLocation: (...a: unknown[]) => mockGetSharedLocation(...a),
    calculateDeliveryFee: (...a: unknown[]) => mockCalculateDeliveryFee(...a),
    nomeDoLugar: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('../../../../services/api', () => ({ __esModule: true, getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : 'Erro') }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const CLIENTE = {
  id: 'u1', name: 'Cliente Teste', phone_number: '5563900000001',
  total_orders: 3, total_spent: 100, addresses: [],
};
const PIN = {
  lat: -10.180000, lng: -48.330000,
  address: 'Quadra 100 Sul, Alameda 1, 10 - Palmas - TO',
  shared_at: '2026-11-26T14:24:00Z',
};

const montar = () => renderHook(() => useNewOrderWizard({ storeSlug: 'ce-saladas' }));

beforeEach(() => {
  mockGetSharedLocation.mockReset();
  mockCalculateDeliveryFee.mockReset();
});

it('escolher o cliente busca o pin do WhatsApp pelo telefone', async () => {
  mockGetSharedLocation.mockResolvedValue(PIN);
  const { result } = montar();

  act(() => result.current.setCustomer(CLIENTE));

  await waitFor(() => expect(result.current.pinDoWhatsapp).toEqual(PIN));
  expect(mockGetSharedLocation).toHaveBeenCalledWith('ce-saladas', { phone: '5563900000001' });
});

it('cliente sem pin deixa pinDoWhatsapp nulo, sem erro na tela', async () => {
  mockGetSharedLocation.mockResolvedValue(null);
  const { result } = montar();

  act(() => result.current.setCustomer(CLIENTE));

  await waitFor(() => expect(mockGetSharedLocation).toHaveBeenCalled());
  expect(result.current.pinDoWhatsapp).toBeNull();
});

it('falha ao buscar o pin não quebra o pedido', async () => {
  mockGetSharedLocation.mockRejectedValue(new Error('rede'));
  const { result } = montar();

  act(() => result.current.setCustomer(CLIENTE));

  await waitFor(() => expect(mockGetSharedLocation).toHaveBeenCalled());
  expect(result.current.pinDoWhatsapp).toBeNull();
});

it('trocar de cliente limpa o pin do anterior', async () => {
  mockGetSharedLocation.mockResolvedValueOnce(PIN).mockResolvedValueOnce(null);
  const { result } = montar();

  act(() => result.current.setCustomer(CLIENTE));
  await waitFor(() => expect(result.current.pinDoWhatsapp).toEqual(PIN));

  act(() => result.current.setCustomer({ ...CLIENTE, id: 'u2', phone_number: '5563999990000' }));
  await waitFor(() => expect(mockGetSharedLocation).toHaveBeenCalledTimes(2));
  expect(result.current.pinDoWhatsapp).toBeNull();
});

it('usar o pin calcula o frete pela coordenada e o pedido sai geolocalizado', async () => {
  mockGetSharedLocation.mockResolvedValue(PIN);
  mockCalculateDeliveryFee.mockResolvedValue({ fee: 8, distance_km: 8.56, duration_minutes: 13 });
  const { result } = montar();

  act(() => result.current.setCustomer(CLIENTE));
  await waitFor(() => expect(result.current.pinDoWhatsapp).toEqual(PIN));

  await act(async () => { await result.current.usarPinDoWhatsapp(); });

  expect(mockCalculateDeliveryFee).toHaveBeenCalledWith('ce-saladas', PIN.address, { lat: PIN.lat, lng: PIN.lng });
  expect(result.current.freeAddressText).toBe(PIN.address);
  expect(result.current.routeQuote?.fee).toBe(8);
  expect(result.current.pinEmUso).toBe(true);
});
