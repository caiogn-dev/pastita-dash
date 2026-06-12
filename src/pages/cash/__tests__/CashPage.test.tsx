import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CashPage from '../CashPage';
import * as cashService from '../../../services/cash';

jest.mock('../../../services/cash', () => ({
  getCurrentCashSession: jest.fn(),
  openCashSession: jest.fn(),
  addCashMovement: jest.fn(),
  closeCashSession: jest.fn(),
}));

const mocked = cashService as jest.Mocked<typeof cashService>;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stores/loja-x/cash']}>
      <Routes>
        <Route path="/stores/:storeId/cash" element={<CashPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('CashPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sem caixa aberto mostra formulário de abertura e abre com fundo de troco', async () => {
    mocked.getCurrentCashSession.mockRejectedValue({ response: { status: 404 } });
    mocked.openCashSession.mockResolvedValue({
      data: { id: 's1', status: 'open', opening_amount: '100.00', movements: [], expected_cash: '100.00' },
    } as never);

    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: /abrir caixa/i })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/fundo de troco/i), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /abrir caixa/i }));

    await waitFor(() => expect(mocked.openCashSession).toHaveBeenCalledWith('loja-x', '100'));
  });

  it('com caixa aberto mostra esperado em caixa e registra sangria', async () => {
    mocked.getCurrentCashSession.mockResolvedValue({
      data: {
        id: 's1', status: 'open', opening_amount: '100.00',
        opened_at: '2026-06-12T10:00:00Z', movements: [], expected_cash: '100.00',
      },
    } as never);
    mocked.addCashMovement.mockResolvedValue({ data: { id: 'm1' } } as never);

    renderPage();
    await waitFor(() => expect(screen.getByText(/esperado em caixa/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/valor do movimento/i), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: /sangria/i }));

    await waitFor(() =>
      expect(mocked.addCashMovement).toHaveBeenCalledWith('loja-x', expect.objectContaining({
        kind: 'sangria', amount: '40',
      })),
    );
  });

  it('fechamento envia valor contado', async () => {
    mocked.getCurrentCashSession.mockResolvedValue({
      data: {
        id: 's1', status: 'open', opening_amount: '100.00',
        opened_at: '2026-06-12T10:00:00Z', movements: [], expected_cash: '100.00',
      },
    } as never);
    mocked.closeCashSession.mockResolvedValue({
      data: { status: 'closed', difference: '-5.00', expected_amount: '100.00', counted_amount: '95.00' },
    } as never);

    renderPage();
    await waitFor(() => expect(screen.getByText(/esperado em caixa/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/valor contado/i), { target: { value: '95' } });
    fireEvent.click(screen.getByRole('button', { name: /fechar caixa/i }));

    await waitFor(() => expect(mocked.closeCashSession).toHaveBeenCalledWith('loja-x', '95', ''));
  });
});
