import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const listar = jest.fn();
const criar = jest.fn();
const atualizar = jest.fn();

// `payments.ts` NAO tem export default — e um export nomeado `paymentsService`,
// e `getGateways` devolve PaginatedResponse (`.results`), nao um array.
const catalogo = jest.fn();

jest.mock('../../../services/payments', () => ({
  paymentsService: {
    getGateways: (...a: unknown[]) => listar(...a),
    createGateway: (...a: unknown[]) => criar(...a),
    updateGateway: (...a: unknown[]) => atualizar(...a),
    getVoucherBrands: (...a: unknown[]) => catalogo(...a),
  },
}));

import VoucherSection from '../VoucherSection';

beforeEach(() => {
  jest.clearAllMocks();
  listar.mockResolvedValue({ results: [] });
  criar.mockResolvedValue({ id: 'g1' });
  atualizar.mockResolvedValue({ id: 'g1' });
  // O catalogo vem do backend. O painel nao tem lista propria de bandeiras.
  catalogo.mockResolvedValue({
    brands: [
      { value: 'vr', label: 'VR Benefícios' },
      { value: 'sodexo', label: 'Sodexo' },
      { value: 'ticket', label: 'Ticket' },
    ],
  });
});

describe('VoucherSection', () => {
  it('tem campo para as DUAS chaves', async () => {
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByLabelText(/chave secreta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chave p[úu]blica/i)).toBeInTheDocument();
  });

  it('monta os toggles a partir do catálogo do backend', async () => {
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByLabelText('VR Benefícios')).toBeInTheDocument();
    expect(screen.getByLabelText('Sodexo')).toBeInTheDocument();
    expect(screen.getByLabelText('Ticket')).toBeInTheDocument();
    expect(catalogo).toHaveBeenCalledTimes(1);
  });

  it('bandeira que o backend NAO manda simplesmente nao aparece', async () => {
    // Alelo esta fora do catalogo. O painel nao precisa saber o porque, e nao
    // pode ter um `if` sobre ela — basta nao receber.
    render(<VoucherSection storeId="s1" />);
    await screen.findByLabelText('VR Benefícios');
    expect(screen.queryByLabelText(/alelo/i)).not.toBeInTheDocument();
  });

  it('se o backend mandar uma bandeira nova, ela aparece sem deploy do painel', async () => {
    catalogo.mockResolvedValue({
      brands: [{ value: 'caju', label: 'Caju' }],
    });
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByLabelText('Caju')).toBeInTheDocument();
  });

  it('salva as chaves e as bandeiras marcadas', async () => {
    render(<VoucherSection storeId="s1" />);
    fireEvent.change(await screen.findByLabelText(/chave secreta/i),
      { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i),
      { target: { value: 'pk_test_y' } });
    fireEvent.click(screen.getByLabelText('VR Benefícios'));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0][0]).toMatchObject({
      gateway_type: 'pagarme',
      api_key: 'sk_test_x',
      public_key: 'pk_test_y',
      configuration: { voucher_brands: ['vr'] },
    });
  });

  it('avisa quando as chaves são de ambientes diferentes', async () => {
    render(<VoucherSection storeId="s1" />);
    fireEvent.change(await screen.findByLabelText(/chave secreta/i),
      { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i),
      { target: { value: 'pk_producao' } });

    expect(await screen.findByText(/ambientes diferentes/i)).toBeInTheDocument();
  });

  it('não salva sem nenhuma bandeira marcada', async () => {
    render(<VoucherSection storeId="s1" />);
    fireEvent.change(await screen.findByLabelText(/chave secreta/i),
      { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i),
      { target: { value: 'pk_test_y' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(screen.getByText(/ao menos uma bandeira/i)).toBeInTheDocument());
    expect(criar).not.toHaveBeenCalled();
  });
});
