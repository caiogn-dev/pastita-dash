/**
 * Respostas rápidas: gerência simples, salva no metadata da loja.
 * O backend SUBSTITUI o metadata inteiro no PATCH — o resto tem que ir junto.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const salvarLoja = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  updateStore: (...a: unknown[]) => salvarLoja(...a),
}));

let mockLoja: { id: string; slug: string; metadata: Record<string, unknown> } = {
  id: 's1', slug: 'loja-x', metadata: { google_review_url: 'https://g.page/x' },
};
jest.mock('../../../hooks/useStore', () => ({
  useStore: () => ({ storeId: mockLoja.id, storeSlug: mockLoja.slug, store: mockLoja }),
}));

import { RespostasRapidasPage } from '../RespostasRapidasPage';
import { useRootStore } from '../../../stores/rootStore';

const renderizar = () => render(<MemoryRouter><RespostasRapidasPage /></MemoryRouter>);

beforeEach(() => {
  jest.clearAllMocks();
  mockLoja = { id: 's1', slug: 'loja-x', metadata: { google_review_url: 'https://g.page/x' } };
  act(() => useRootStore.getState().setStores([mockLoja as never]));
  salvarLoja.mockImplementation(async (_id: string, dados: { metadata: Record<string, unknown> }) => ({
    ...mockLoja, metadata: dados.metadata,
  }));
});

const salvouCom = () => salvarLoja.mock.calls.at(-1)[1].metadata;

describe('RespostasRapidasPage', () => {
  it('na primeira vez mostra as 4 sugestões e explica que dá para editar', () => {
    renderizar();
    for (const a of ['/frete', '/pagamento', '/horario', '/menu']) {
      expect(screen.getAllByText(a).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/sugestões prontas/i)).toBeInTheDocument();
  });

  it('adicionar grava a lista inteira sem apagar o resto do metadata', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /nova resposta/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/atalho/i), { target: { value: 'Troco' } });
    fireEvent.change(within(dialogo).getByLabelText(/texto/i), { target: { value: 'Precisa de troco para quanto?' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /salvar resposta/i }));

    await waitFor(() => expect(salvarLoja).toHaveBeenCalled());
    expect(salvarLoja.mock.calls[0][0]).toBe('s1');
    const meta = salvouCom();
    expect(meta.google_review_url).toBe('https://g.page/x');
    expect(meta.respostas_rapidas).toHaveLength(5);
    expect(meta.respostas_rapidas.at(-1)).toEqual({ atalho: 'troco', texto: 'Precisa de troco para quanto?' });
    // O inbox lê a loja do rootStore: sem isto a resposta nova só apareceria no F5.
    expect((useRootStore.getState().stores[0].metadata as Record<string, unknown>).respostas_rapidas).toHaveLength(5);
  });

  it('não deixa salvar atalho com nome de comando', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /nova resposta/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/atalho/i), { target: { value: 'pix' } });
    fireEvent.change(within(dialogo).getByLabelText(/texto/i), { target: { value: 'x' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /salvar resposta/i }));
    expect(await within(dialogo).findByText(/já é um comando/i)).toBeInTheDocument();
    expect(salvarLoja).not.toHaveBeenCalled();
  });

  it('editar troca o texto e remover tira da lista', async () => {
    mockLoja.metadata = { respostas_rapidas: [{ atalho: 'frete', texto: 'velho' }, { atalho: 'troco', texto: 't' }] };
    renderizar();
    fireEvent.click(screen.getAllByRole('button', { name: /ações de \/frete/i })[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: /editar/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/texto/i), { target: { value: 'novo' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /salvar resposta/i }));
    await waitFor(() => expect(salvouCom().respostas_rapidas[0]).toEqual({ atalho: 'frete', texto: 'novo' }));

    fireEvent.click(screen.getAllByRole('button', { name: /ações de \/troco/i })[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: /remover/i }));
    await waitFor(() => expect(salvouCom().respostas_rapidas).toEqual([{ atalho: 'frete', texto: 'novo' }]));
  });

  it('erro ao salvar avisa e não finge que salvou', async () => {
    salvarLoja.mockRejectedValue(new Error('rede'));
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /nova resposta/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/atalho/i), { target: { value: 'troco' } });
    fireEvent.change(within(dialogo).getByLabelText(/texto/i), { target: { value: 'x' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /salvar resposta/i }));
    expect(await screen.findByText(/não consegui salvar/i)).toBeInTheDocument();
    expect(screen.queryAllByText('/troco')).toHaveLength(0);
  });
});
