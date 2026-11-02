// O alarme de pedido novo: toca, repete, e PARA quando o pedido sai de
// "Recebido" — não mais num prazo fixo de 30 s.
import { act, renderHook } from '@testing-library/react';
import { useNotificationSound } from '../useNotificationSound';
import { useRootStore } from '../../stores/rootStore';
import { useSomDosPedidos } from '../../stores/somDosPedidos';

const mockTocarSino = jest.fn();
const mockTocarPix = jest.fn();
jest.mock('../../utils/sinoDoBalcao', () => ({
  tocarSino: (...a: unknown[]) => mockTocarSino(...a),
  tocarPix: (...a: unknown[]) => mockTocarPix(...a),
}));

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  resume = jest.fn();
}

beforeAll(() => {
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

beforeEach(() => {
  jest.useFakeTimers();
  mockTocarSino.mockClear();
  mockTocarPix.mockClear();
  useSomDosPedidos.setState({ ligado: true, volume: 'alto' });
  useRootStore.setState({ selectedStoreId: 'loja', stores: [], orders: { loja: [] } } as never);
});

afterEach(() => jest.useRealTimers());

const pedido = (id: string, status: string) => ({ id, status, payment_method: 'cash', payment_status: 'pending' });

it('repete o sino até o pedido ser aceito', () => {
  const { result } = renderHook(() => useNotificationSound());
  act(() => { result.current.playOrderSound('p1'); });
  expect(mockTocarSino).toHaveBeenCalledTimes(1);

  act(() => { useRootStore.setState({ orders: { loja: [pedido('p1', 'pending')] } } as never); });
  act(() => { jest.advanceTimersByTime(60_000); });
  expect(mockTocarSino.mock.calls.length).toBeGreaterThan(5);
  expect(result.current.isAlertActive).toBe(true);

  act(() => { useRootStore.setState({ orders: { loja: [pedido('p1', 'confirmed')] } } as never); });
  expect(result.current.isAlertActive).toBe(false);
  const tocados = mockTocarSino.mock.calls.length;
  act(() => { jest.advanceTimersByTime(60_000); });
  expect(mockTocarSino).toHaveBeenCalledTimes(tocados);
});

it('PIX não pago toca uma vez e não repete', () => {
  const { result } = renderHook(() => useNotificationSound());
  act(() => { result.current.playOrderSound('p2'); });
  act(() => {
    useRootStore.setState({ orders: { loja: [{ ...pedido('p2', 'pending'), payment_method: 'pix' }] } } as never);
  });
  act(() => { jest.advanceTimersByTime(60_000); });
  expect(mockTocarSino).toHaveBeenCalledTimes(1);
});

it('PIX pago avisa com o toque do PIX e toca até aceitar', () => {
  const { result } = renderHook(() => useNotificationSound());
  act(() => {
    useRootStore.setState({ orders: { loja: [{ ...pedido('p3', 'pending'), payment_method: 'pix', payment_status: 'paid' }] } } as never);
  });
  act(() => { result.current.playPixSound('p3'); });
  expect(mockTocarPix).toHaveBeenCalledTimes(1);
  act(() => { jest.advanceTimersByTime(20_000); });
  expect(mockTocarSino).toHaveBeenCalled();
});

it('desligado não toca', () => {
  useSomDosPedidos.setState({ ligado: false });
  const { result } = renderHook(() => useNotificationSound());
  act(() => { result.current.playOrderSound('p1'); });
  expect(mockTocarSino).not.toHaveBeenCalled();
});

it('não toca para sempre: para em 10 minutos mesmo sem aceite', () => {
  const { result } = renderHook(() => useNotificationSound());
  act(() => { result.current.playOrderSound('p1'); });
  act(() => { jest.advanceTimersByTime(11 * 60_000); });
  expect(result.current.isAlertActive).toBe(false);
});
