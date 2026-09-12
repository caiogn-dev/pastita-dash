import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const salvarLoja = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  updateStore: (...a: unknown[]) => salvarLoja(...a),
}));

import AcrescimoDoValeSection from '../AcrescimoDoValeSection';

beforeEach(() => { jest.clearAllMocks(); salvarLoja.mockResolvedValue({ id: 's1' }); });

describe('AcrescimoDoValeSection', () => {
  it('mostra o percentual que a loja já cobra', () => {
    render(<AcrescimoDoValeSection storeId="s1" percentualAtual={10} />);
    expect(screen.getByLabelText(/acréscimo/i)).toHaveValue('10');
  });

  it('salva a taxa que o dono digitou, pelo campo próprio', async () => {
    render(<AcrescimoDoValeSection storeId="s1" />);
    fireEvent.change(screen.getByLabelText(/acréscimo/i), { target: { value: '7,5' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(salvarLoja).toHaveBeenCalledWith('s1', { voucher_fee_percent: 7.5 }));
  });

  it('campo vazio desliga (salva zero)', async () => {
    render(<AcrescimoDoValeSection storeId="s1" percentualAtual={10} />);
    fireEvent.change(screen.getByLabelText(/acréscimo/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(salvarLoja).toHaveBeenCalledWith('s1', { voucher_fee_percent: 0 }));
  });

  it('recusa acima de 100 sem chamar a API', async () => {
    render(<AcrescimoDoValeSection storeId="s1" />);
    fireEvent.change(screen.getByLabelText(/acréscimo/i), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/entre 0 e 100/);
    expect(salvarLoja).not.toHaveBeenCalled();
  });

  it('mostra o efeito em reais num exemplo', () => {
    render(<AcrescimoDoValeSection storeId="s1" percentualAtual={10} />);
    expect(screen.getByText(/R\$ 5,00 a mais/)).toBeInTheDocument();
  });
});
