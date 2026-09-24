/**
 * "Uso caixa com dinheiro vivo": desligado, o Caixa sai do menu.
 *
 * A preferência mora em `store.metadata`, gravada pelo PATCH da loja que o
 * painel já usa. O backend SUBSTITUI o metadata inteiro — então o que a loja
 * já guardava ali (link do Google, localização) tem que ir junto.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const salvarLoja = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  updateStore: (...a: unknown[]) => salvarLoja(...a),
}));

import CaixaDinheiroSection from '../CaixaDinheiroSection';
import { useRootStore } from '../../../stores/rootStore';

const LOJA = { id: 's1', slug: 'loja-x', metadata: { google_review_url: 'https://g.page/x' } };

beforeEach(() => {
  jest.clearAllMocks();
  act(() => useRootStore.getState().setStores([LOJA as never]));
});

describe('CaixaDinheiroSection', () => {
  it('sem preferência gravada, começa ligado', () => {
    render(<CaixaDinheiroSection loja={LOJA} />);
    expect(screen.getByRole('switch', { name: /uso caixa com dinheiro vivo/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('desligar grava no metadata sem apagar o resto e tira o Caixa do menu', async () => {
    const salva = { ...LOJA, metadata: { ...LOJA.metadata, usa_caixa_dinheiro: false } };
    salvarLoja.mockResolvedValue(salva);
    const onSalvo = jest.fn();
    render(<CaixaDinheiroSection loja={LOJA} onSalvo={onSalvo} />);

    fireEvent.click(screen.getByRole('switch', { name: /uso caixa com dinheiro vivo/i }));

    await waitFor(() =>
      expect(salvarLoja).toHaveBeenCalledWith('s1', {
        metadata: { google_review_url: 'https://g.page/x', usa_caixa_dinheiro: false },
      }),
    );
    await waitFor(() => expect(onSalvo).toHaveBeenCalledWith(salva));
    // O menu lê a loja do rootStore: sem atualizar lá, o Caixa só sumiria no F5.
    expect(useRootStore.getState().stores[0].metadata).toMatchObject({ usa_caixa_dinheiro: false });
  });

  it('erro ao salvar volta o interruptor — ligado sem ter salvo é pior que não mexer', async () => {
    salvarLoja.mockRejectedValue(new Error('500'));
    render(<CaixaDinheiroSection loja={LOJA} />);
    const chave = screen.getByRole('switch', { name: /uso caixa com dinheiro vivo/i });

    fireEvent.click(chave);

    await waitFor(() => expect(chave).toHaveAttribute('aria-checked', 'true'));
    expect(await screen.findByText(/não consegui salvar/i)).toBeInTheDocument();
  });
});
