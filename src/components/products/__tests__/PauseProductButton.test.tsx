import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PauseProductButton from '../PauseProductButton';
import * as commerce from '../../../services/commerce';

jest.mock('../../../services/commerce', () => ({
  pauseProduct: jest.fn(),
  unpauseProduct: jest.fn(),
}));

const mockedPause = commerce.pauseProduct as jest.Mock;
const mockedUnpause = commerce.unpauseProduct as jest.Mock;

describe('PauseProductButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('produto ativo mostra menu de pausa e chama pauseProduct com minutos', async () => {
    mockedPause.mockResolvedValue({ data: { is_paused: true, paused_until: '2026-06-12T01:00:00Z' } });
    const onChanged = jest.fn();
    render(<PauseProductButton productId="p1" isPaused={false} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole('button', { name: /pausar/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /2 horas/i }));

    await waitFor(() => expect(mockedPause).toHaveBeenCalledWith('p1', 120));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('opção "até amanhã" chama pauseProduct sem minutos', async () => {
    mockedPause.mockResolvedValue({ data: { is_paused: true } });
    render(<PauseProductButton productId="p1" isPaused={false} onChanged={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /pausar/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /amanhã/i }));

    await waitFor(() => expect(mockedPause).toHaveBeenCalledWith('p1', undefined));
  });

  it('produto pausado mostra botão de retomar e chama unpauseProduct', async () => {
    mockedUnpause.mockResolvedValue({ data: { is_paused: false } });
    const onChanged = jest.fn();
    render(<PauseProductButton productId="p1" isPaused onChanged={onChanged} />);

    fireEvent.click(screen.getByRole('button', { name: /retomar/i }));

    await waitFor(() => expect(mockedUnpause).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });
});
