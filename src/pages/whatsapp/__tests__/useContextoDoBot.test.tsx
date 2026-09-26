/**
 * O contexto do bot acompanha a conversa aberta: busca ao abrir, a cada 30 s,
 * e quando chega mensagem nova pelo WebSocket que o inbox já tem.
 * Assumir/Devolver são otimistas e voltam atrás com erro visível.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useContextoDoBot } from '../useContextoDoBot';
import { useChatStore } from '../../../stores/chatStore';

const getContextoDoBot = jest.fn();
const assumir = jest.fn();
const devolverAoBot = jest.fn();
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getContextoDoBot: (...a: unknown[]) => getContextoDoBot(...a),
    assumir: (...a: unknown[]) => assumir(...a),
    devolverAoBot: (...a: unknown[]) => devolverAoBot(...a),
  },
}));

const CTX = {
  modo: 'human', motivo: { codigo: 'pediu_atendente', texto: '', desde: null },
  esperando_ha_segundos: 60, ultima_msg_cliente: null, ultima_msg_atendente: null, carrinho: null, cliente: null,
};

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  getContextoDoBot.mockReset().mockResolvedValue(CTX);
  assumir.mockReset();
  devolverAoBot.mockReset();
  act(() => {
    useChatStore.getState().setConversations([{ id: 'c1', mode: 'human' } as never]);
  });
});

afterEach(() => jest.useRealTimers());

const modo = () => useChatStore.getState().conversations.find((c) => c.id === 'c1')?.mode;

it('busca ao abrir e de novo a cada 30 s', async () => {
  renderHook(() => useContextoDoBot('c1', true, undefined));
  await waitFor(() => expect(getContextoDoBot).toHaveBeenCalledTimes(1));
  await act(async () => { jest.advanceTimersByTime(30_000); });
  expect(getContextoDoBot).toHaveBeenCalledTimes(2);
});

it('mensagem nova (gatilho do WebSocket) busca de novo', async () => {
  const { rerender } = renderHook(({ g }) => useContextoDoBot('c1', true, g), { initialProps: { g: 'm1' } });
  await waitFor(() => expect(getContextoDoBot).toHaveBeenCalledTimes(1));
  rerender({ g: 'm2' });
  await waitFor(() => expect(getContextoDoBot).toHaveBeenCalledTimes(2));
});

it('fora do modo humano não busca nada', async () => {
  renderHook(() => useContextoDoBot('c1', false, undefined));
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(getContextoDoBot).not.toHaveBeenCalled();
});

it('Devolver ao bot muda o modo na hora e volta atrás se o backend recusar', async () => {
  devolverAoBot.mockRejectedValue(new Error('500'));
  const { result } = renderHook(() => useContextoDoBot('c1', true, undefined));
  await waitFor(() => expect(result.current.contexto).not.toBeNull());

  let promessa: Promise<void> = Promise.resolve();
  act(() => { promessa = result.current.devolver(); });
  expect(modo()).toBe('auto');
  await act(async () => { await promessa; });

  expect(devolverAoBot).toHaveBeenCalledWith('c1');
  expect(modo()).toBe('human');
  expect(result.current.erroDaAcao).toMatch(/não foi possível devolver/i);
});

it('Assumir marca a conversa como assumida na hora', async () => {
  let resolver: (v: unknown) => void = () => {};
  assumir.mockReturnValue(new Promise((r) => { resolver = r; }));
  const { result } = renderHook(() => useContextoDoBot('c1', true, undefined));
  await waitFor(() => expect(result.current.contexto).not.toBeNull());

  act(() => { void result.current.assumir(); });
  expect(result.current.contexto?.motivo?.codigo).toBe('atendente_assumiu');
  expect(result.current.acao).toBe('assumindo');

  await act(async () => { resolver({}); });
  expect(assumir).toHaveBeenCalledWith('c1');
  expect(result.current.acao).toBeNull();
});

it('Assumir que falha volta o motivo e mostra o erro', async () => {
  assumir.mockRejectedValue(new Error('500'));
  const { result } = renderHook(() => useContextoDoBot('c1', true, undefined));
  await waitFor(() => expect(result.current.contexto).not.toBeNull());

  await act(async () => { await result.current.assumir(); });

  expect(result.current.contexto?.motivo?.codigo).toBe('pediu_atendente');
  expect(result.current.erroDaAcao).toMatch(/não foi possível assumir/i);
});
