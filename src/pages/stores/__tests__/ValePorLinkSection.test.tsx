import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const catalogo = jest.fn();
const salvarLoja = jest.fn();

jest.mock('../../../services/payments', () => ({
  paymentsService: { getVoucherBrands: (...a: unknown[]) => catalogo(...a) },
}));
jest.mock('../../../services/storesApi', () => ({
  updateStore: (...a: unknown[]) => salvarLoja(...a),
}));

import ValePorLinkSection from '../ValePorLinkSection';

beforeEach(() => {
  jest.clearAllMocks();
  // As bandeiras por link vêm do backend, na mesma chamada do catálogo
  // integrado — o painel não mantém lista própria.
  catalogo.mockResolvedValue({
    brands: [{ value: 'vr', label: 'VR Benefícios' }],
    manual_brands: [{ value: 'volus', label: 'Volus' }],
  });
  salvarLoja.mockResolvedValue({ id: 's1' });
});

const montar = (props = {}) =>
  render(<ValePorLinkSection storeId="s1" ligadas={[]} whatsapp="5563999998888" {...props} />);

describe('ValePorLinkSection', () => {
  it('lista só as bandeiras SEM integração', async () => {
    montar();
    expect(await screen.findByLabelText('Volus')).toBeInTheDocument();
    expect(screen.queryByLabelText('VR Benefícios')).not.toBeInTheDocument();
  });

  it('marca o que já está ligado na loja', async () => {
    montar({ ligadas: ['volus'] });
    expect(await screen.findByLabelText('Volus')).toBeChecked();
  });

  it('salva pelo campo próprio, nunca mandando o metadata inteiro', async () => {
    montar();
    fireEvent.click(await screen.findByLabelText('Volus'));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(salvarLoja).toHaveBeenCalled());
    const [id, corpo] = salvarLoja.mock.calls[0];
    expect(id).toBe('s1');
    expect(corpo).toEqual({ vale_por_link_brands: ['volus'] });
    expect(corpo).not.toHaveProperty('metadata');
  });

  it('desmarcar tudo salva lista vazia — é como se desliga', async () => {
    montar({ ligadas: ['volus'] });
    fireEvent.click(await screen.findByLabelText('Volus'));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(salvarLoja).toHaveBeenCalledWith(
      's1', { vale_por_link_brands: [] }));
  });

  it('sem WhatsApp na loja, avisa que a opção não vai aparecer', async () => {
    montar({ whatsapp: '' });
    expect(await screen.findByRole('alert')).toHaveTextContent(/WhatsApp/i);
  });

  it('com WhatsApp não fica alertando à toa', async () => {
    montar();
    await screen.findByLabelText('Volus');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('erro ao salvar aparece na tela, não só no console', async () => {
    salvarLoja.mockRejectedValue(new Error('502'));
    montar();
    fireEvent.click(await screen.findByLabelText('Volus'));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não consegui salvar/i);
  });
});
