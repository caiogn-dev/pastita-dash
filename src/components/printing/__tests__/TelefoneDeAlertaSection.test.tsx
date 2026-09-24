/**
 * Para quem avisar quando a impressora parar.
 *
 * O backend lê `store.metadata.telefone_de_alerta`; vazio, cai no telefone da
 * loja — e se esse for o próprio número do WhatsApp da loja, não avisa
 * ninguém. Por isso o campo existe.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const buscarLoja = jest.fn();
const salvarLoja = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  getStore: (...a: unknown[]) => buscarLoja(...a),
  updateStore: (...a: unknown[]) => salvarLoja(...a),
}));

import { TelefoneDeAlertaSection } from '../TelefoneDeAlertaSection';

const LOJA = {
  id: 's1',
  metadata: { google_review_url: 'https://g.page/x', telefone_de_alerta: '63999990000' },
};

beforeEach(() => {
  jest.clearAllMocks();
  buscarLoja.mockResolvedValue(LOJA);
  salvarLoja.mockImplementation(async (_id: string, dados: { metadata: object }) => ({ ...LOJA, ...dados }));
});

describe('TelefoneDeAlertaSection', () => {
  it('mostra o telefone que já está gravado', async () => {
    render(<TelefoneDeAlertaSection storeId="s1" />);
    expect(await screen.findByLabelText(/telefone para avisos de impressora/i)).toHaveValue('63999990000');
    expect(screen.getByText(/não pode ser o próprio número do whatsapp da loja/i)).toBeInTheDocument();
  });

  it('salva a chave no metadata sem apagar o resto', async () => {
    render(<TelefoneDeAlertaSection storeId="s1" />);
    const campo = await screen.findByLabelText(/telefone para avisos de impressora/i);
    fireEvent.change(campo, { target: { value: '(63) 98888-7777' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar telefone/i }));

    await waitFor(() =>
      expect(salvarLoja).toHaveBeenCalledWith('s1', {
        metadata: { google_review_url: 'https://g.page/x', telefone_de_alerta: '63988887777' },
      }),
    );
    expect(await screen.findByText(/salvo/i)).toBeInTheDocument();
  });

  it('lê a loja de novo antes de salvar — o metadata é trocado inteiro', async () => {
    render(<TelefoneDeAlertaSection storeId="s1" />);
    await screen.findByLabelText(/telefone para avisos de impressora/i);
    buscarLoja.mockResolvedValueOnce({ ...LOJA, metadata: { ...LOJA.metadata, usa_caixa_dinheiro: false } });
    fireEvent.click(screen.getByRole('button', { name: /salvar telefone/i }));

    await waitFor(() =>
      expect(salvarLoja).toHaveBeenCalledWith('s1', {
        metadata: expect.objectContaining({ usa_caixa_dinheiro: false, telefone_de_alerta: '63999990000' }),
      }),
    );
  });
});
