/**
 * O operador tem que VER o endereço, não o link.
 *
 * Puxar o pin do WhatsApp escrevia "Localização enviada (-10.18, -48.33)" no
 * campo. Colar o link do Maps deixava a URL. Nos dois casos o operador fecha o
 * pedido sem nunca ler para onde a entrega vai — e foi assim que o
 * CE-2609103109 saiu com uma URL no lugar do endereço.
 */
import { renderHook, act } from '@testing-library/react';

const calculateDeliveryFee = jest.fn();
const getSharedLocation = jest.fn();
const nomeDoLugar = jest.fn();
jest.mock('../../../../services/orders', () => ({
  ordersService: {
    calculateDeliveryFee: (...a: unknown[]) => calculateDeliveryFee(...a),
    getSharedLocation: (...a: unknown[]) => getSharedLocation(...a),
    nomeDoLugar: (...a: unknown[]) => nomeDoLugar(...a),
  },
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../../services/api', () => ({ __esModule: true, getErrorMessage: () => 'Erro' }));

import { useNewOrderWizard } from '../useNewOrderWizard';

const CLIENTE = { id: 'c1', name: 'Leani', phone_number: '5563992618115' } as never;
const ENDERECO = 'Avenida Juscelino Kubitscheck, 38-76 — Plano Diretor Norte, Palmas-TO';

beforeEach(() => {
  jest.clearAllMocks();
  calculateDeliveryFee.mockResolvedValue({ fee: 10, distance_km: 5, duration_minutes: 20 });
  nomeDoLugar.mockResolvedValue(ENDERECO);
});

const montar = () => renderHook(() => useNewOrderWizard({ storeSlug: 'ce-saladas' }));

// No fluxo real o texto já está no campo quando "Calcular" é clicado: o
// operador digitou ou colou antes. O teste tem que fazer o mesmo.
const digitarECalcular = async (result: { current: ReturnType<typeof useNewOrderWizard> }, texto: string) => {
  act(() => result.current.setFreeAddressText(texto));
  await act(async () => { await result.current.handleCalculateRoute(texto); });
};

it('puxar o pin do WhatsApp escreve o endereço, não "Localização enviada"', async () => {
  getSharedLocation.mockResolvedValue({ lat: -10.18314, lng: -48.33626 });
  const { result } = montar();
  act(() => result.current.setCustomer(CLIENTE));
  await act(async () => { await result.current.handleUseSharedLocation(); });

  expect(result.current.freeAddressText).toBe(ENDERECO);
});

it('link do Maps colado vira endereço na tela', async () => {
  const { result } = montar();
  await digitarECalcular(result, 'https://www.google.com/maps/@-10.18314,-48.33626,17z');

  expect(result.current.freeAddressText).toBe(ENDERECO);
  expect(result.current.routeQuote?.fee).toBe(10);
});

it('endereço escrito por gente fica como está e não chama a rede', async () => {
  const { result } = montar();
  await digitarECalcular(result, 'Quadra 104 Norte, casa 3');

  expect(nomeDoLugar).not.toHaveBeenCalled();
  expect(result.current.freeAddressText).toBe('Quadra 104 Norte, casa 3');
});

it('se não der para nomear, o texto original sobrevive', async () => {
  nomeDoLugar.mockResolvedValue(null);
  const { result } = montar();
  await digitarECalcular(result, 'https://www.google.com/maps/@-10.18314,-48.33626,17z');

  expect(result.current.freeAddressText).toBe('https://www.google.com/maps/@-10.18314,-48.33626,17z');
  expect(result.current.routeQuote?.fee).toBe(10);
});

it('o nome do lugar nunca atrasa o frete: a cotação vale mesmo se ele falhar', async () => {
  nomeDoLugar.mockRejectedValue(new Error('rede'));
  const { result } = montar();
  await digitarECalcular(result, '-10.18314,-48.33626');

  expect(result.current.routeQuote?.fee).toBe(10);
});
