import { useState } from 'react';
import { render, act } from '@testing-library/react';
import { useAcompanharPix, type CobrancaPix } from '../useAcompanharPix';
import { ordersService } from '../../../services/orders';

jest.mock('../../../services/orders', () => ({ ordersService: { getOrder: jest.fn() } }));
const getOrder = ordersService.getOrder as jest.Mock;

const aba = (estado: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
  document.dispatchEvent(new Event('visibilitychange'));
};

let estadoAtual: CobrancaPix[] | null = null;
const Probe = ({ aoPagarTudo }: { aoPagarTudo: () => void }) => {
  const [c, setC] = useState<CobrancaPix[] | null>([
    { order: { id: 'a' }, storeSlug: 'loja', paid: false },
  ]);
  estadoAtual = c;
  useAcompanharPix(c, setC, aoPagarTudo);
  return null;
};

describe('useAcompanharPix', () => {
  beforeEach(() => { jest.useFakeTimers(); aba('visible'); getOrder.mockReset(); });
  afterEach(() => { jest.useRealTimers(); aba('visible'); });

  it('consulta a cada 4s e avisa uma vez quando paga', async () => {
    getOrder.mockResolvedValue({ payment_status: 'paid' });
    const fim = jest.fn();
    render(<Probe aoPagarTudo={fim} />);
    await act(async () => { jest.advanceTimersByTime(4000); });
    expect(getOrder).toHaveBeenCalledWith('a', 'loja');
    expect(estadoAtual?.[0].paid).toBe(true);
    expect(fim).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(12_000); });
    expect(getOrder).toHaveBeenCalledTimes(1);
  });

  it('com a aba escondida não consulta; ao voltar consulta na hora', async () => {
    getOrder.mockResolvedValue({ payment_status: 'pending' });
    render(<Probe aoPagarTudo={jest.fn()} />);
    aba('hidden');
    await act(async () => { jest.advanceTimersByTime(20_000); });
    expect(getOrder).not.toHaveBeenCalled();
    await act(async () => { aba('visible'); });
    expect(getOrder).toHaveBeenCalledTimes(1);
  });
});
