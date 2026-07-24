import React from 'react';
import { render, act } from '@testing-library/react';
import { useBarcodeScanner } from '../useBarcodeScanner';

const Harness: React.FC<{ onScan: (c: string) => void; disabled?: boolean }> = ({ onScan, disabled }) => {
  useBarcodeScanner(onScan, { disabled });
  return <div />;
};

const pressKeys = (keys: string[]) => {
  keys.forEach((key) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
};

describe('useBarcodeScanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });
  afterEach(() => jest.useRealTimers());

  it('dispara onScan em rajada rápida terminada em Enter', () => {
    const onScan = jest.fn();
    render(<Harness onScan={onScan} />);
    act(() => {
      pressKeys(['2', '0', '0', '0', '0', '4', '2', 'Enter']);
    });
    expect(onScan).toHaveBeenCalledWith('2000042');
  });

  it('não dispara com digitação humana (pausas longas entre teclas)', () => {
    const onScan = jest.fn();
    render(<Harness onScan={onScan} />);
    act(() => {
      ['1', '2', '3', '4', '5'].forEach((key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        jest.advanceTimersByTime(200); // humano: >80ms por tecla → buffer zera
      });
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onScan).not.toHaveBeenCalled();
  });

  it('ignora códigos curtos demais', () => {
    const onScan = jest.fn();
    render(<Harness onScan={onScan} />);
    act(() => {
      pressKeys(['1', '2', 'Enter']);
    });
    expect(onScan).not.toHaveBeenCalled();
  });

  it('não captura quando disabled', () => {
    const onScan = jest.fn();
    render(<Harness onScan={onScan} disabled />);
    act(() => {
      pressKeys(['1', '2', '3', '4', '5', 'Enter']);
    });
    expect(onScan).not.toHaveBeenCalled();
  });
});
