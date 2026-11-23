/**
 * "Conectar Mercado Pago" redireciona a janela inteira para a URL que a API
 * devolveu. Se vier um esquema perigoso (`javascript:`), navegar executaria
 * script no painel: o clique tem que virar aviso de erro, sem navegar.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockAuthUrl = jest.fn();
jest.mock('../../../services/payments', () => ({
  paymentsService: {
    getGateways: jest.fn().mockResolvedValue({ results: [] }),
    getMercadoPagoAuthUrl: (...a: unknown[]) => mockAuthUrl(...a),
  },
}));
const mockErro = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: (...a: unknown[]) => mockErro(...a), success: jest.fn() },
}));

import { RecebimentoSection } from '../RecebimentoSection';

describe('RecebimentoSection — conectar', () => {
  it('URL com esquema perigoso não navega: avisa e libera o botão', async () => {
    mockAuthUrl.mockResolvedValue('javascript:alert(document.cookie)');
    render(<MemoryRouter><RecebimentoSection storeId="s1" /></MemoryRouter>);

    const botao = await screen.findByRole('button', { name: /conectar conta do mercado pago/i });
    fireEvent.click(botao);

    await waitFor(() =>
      expect(mockErro).toHaveBeenCalledWith('Não consegui abrir o Mercado Pago. Tente de novo.'),
    );
    expect(screen.getByRole('button', { name: /conectar conta do mercado pago/i })).toBeEnabled();
  });
});
