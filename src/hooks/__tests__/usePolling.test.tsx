import { render, act } from '@testing-library/react';
import { usePolling } from '../usePolling';

const Probe = ({ fn, ms = 1000, ativo = true }: { fn: () => void; ms?: number; ativo?: boolean }) => {
  usePolling(fn, ms, ativo);
  return null;
};

const aba = (estado: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('usePolling', () => {
  beforeEach(() => { jest.useFakeTimers(); aba('visible'); });
  afterEach(() => { jest.useRealTimers(); aba('visible'); });

  it('roda a cada intervalo com a aba visível', () => {
    const fn = jest.fn();
    render(<Probe fn={fn} />);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('não chama a API com a aba escondida', () => {
    const fn = jest.fn();
    render(<Probe fn={fn} />);
    aba('hidden');
    act(() => { jest.advanceTimersByTime(10_000); });
    expect(fn).not.toHaveBeenCalled();
  });

  it('ao voltar depois de mais que o intervalo, atualiza na hora', () => {
    const fn = jest.fn();
    render(<Probe fn={fn} />);
    aba('hidden');
    act(() => { jest.advanceTimersByTime(10_000); });
    aba('visible');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ao voltar logo depois de uma atualização, não duplica a chamada', () => {
    const fn = jest.fn();
    render(<Probe fn={fn} />);
    act(() => { jest.advanceTimersByTime(1000); });
    aba('hidden');
    aba('visible');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('usa sempre a função mais recente e para ao desmontar', () => {
    const velha = jest.fn();
    const nova = jest.fn();
    const { rerender, unmount } = render(<Probe fn={velha} />);
    rerender(<Probe fn={nova} />);
    act(() => { jest.advanceTimersByTime(1000); });
    expect(velha).not.toHaveBeenCalled();
    expect(nova).toHaveBeenCalledTimes(1);
    unmount();
    act(() => { jest.advanceTimersByTime(5000); });
    expect(nova).toHaveBeenCalledTimes(1);
  });

  it('desligado não roda; ligado depois, passa a rodar', () => {
    const fn = jest.fn();
    const { rerender } = render(<Probe fn={fn} ativo={false} />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(fn).not.toHaveBeenCalled();
    rerender(<Probe fn={fn} ativo />);
    act(() => { jest.advanceTimersByTime(2000); });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
