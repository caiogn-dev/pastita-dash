/**
 * Formas de pagamento no cardápio, com interruptor (25/11, Ivoneth).
 * Só aparecem as que a loja PODE oferecer (gateway conectado); cada uma liga
 * e desliga na hora.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const buscar = jest.fn();
const salvar = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  getFormasDePagamento: (...a: unknown[]) => buscar(...a),
  updateFormasDePagamento: (...a: unknown[]) => salvar(...a),
}));

import FormasNoCardapioSection from '../FormasNoCardapioSection';

const FORMAS = [
  { metodo: 'pix', rotulo: 'PIX', disponivel: true, ligada: true },
  { metodo: 'credit_card', rotulo: 'Cartão online', disponivel: false, ligada: true },
  { metodo: 'cash', rotulo: 'Dinheiro na entrega ou retirada', disponivel: true, ligada: false },
  { metodo: 'card_on_delivery', rotulo: 'Maquininha na entrega ou retirada', disponivel: true, ligada: true },
];

beforeEach(() => {
  jest.clearAllMocks();
  buscar.mockResolvedValue({ formas: FORMAS });
});

describe('FormasNoCardapioSection', () => {
  it('lista só as disponíveis, cada uma com o estado atual', async () => {
    render(<FormasNoCardapioSection storeId="s1" />);
    expect(await screen.findByRole('switch', { name: 'PIX' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /dinheiro/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('switch', { name: /cartão online/i })).toBeNull();
  });

  it('desligar grava a lista completa de desligadas', async () => {
    salvar.mockResolvedValue({ formas: FORMAS.map((f) => (f.metodo === 'pix' ? { ...f, ligada: false } : f)) });
    render(<FormasNoCardapioSection storeId="s1" />);
    fireEvent.click(await screen.findByRole('switch', { name: 'PIX' }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('s1', ['pix', 'cash']));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'PIX' })).toHaveAttribute('aria-checked', 'false'));
  });

  it('não deixa desligar a última forma ligada', async () => {
    buscar.mockResolvedValue({ formas: [
      { metodo: 'pix', rotulo: 'PIX', disponivel: true, ligada: true },
      { metodo: 'cash', rotulo: 'Dinheiro', disponivel: true, ligada: false },
    ] });
    render(<FormasNoCardapioSection storeId="s1" />);
    expect(await screen.findByRole('switch', { name: 'PIX' })).toBeDisabled();
  });

  it('falha ao salvar volta o interruptor', async () => {
    salvar.mockRejectedValue(new Error('x'));
    render(<FormasNoCardapioSection storeId="s1" />);
    fireEvent.click(await screen.findByRole('switch', { name: 'PIX' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'PIX' })).toHaveAttribute('aria-checked', 'true'));
  });
});
