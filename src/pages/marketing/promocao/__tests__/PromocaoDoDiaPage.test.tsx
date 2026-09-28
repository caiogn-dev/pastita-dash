/**
 * Promoção do dia: liga, escolhe hora e modo, sobe o card do dia, vê a prévia e o histórico.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
const toast = jest.requireMock('react-hot-toast').default as { success: jest.Mock; error: jest.Mock };

const painel = jest.fn();
const dispararAgora = jest.fn();
jest.mock('../../../../services/promoDoDia', () => ({
  __esModule: true,
  promoDoDiaService: { painel: (...a: unknown[]) => painel(...a), dispararAgora: (...a: unknown[]) => dispararAgora(...a) },
}));
const upload = jest.fn();
jest.mock('../../../../services/campaigns', () => ({
  __esModule: true,
  campaignsService: { uploadCampaignMedia: (...a: unknown[]) => upload(...a) },
}));
const salvarLoja = jest.fn();
jest.mock('../../../../services/storesApi', () => ({
  __esModule: true,
  updateStore: (...a: unknown[]) => salvarLoja(...a),
}));
let mockLoja: { id: string; slug: string; metadata: Record<string, unknown> } = { id: 's1', slug: 'loja-x', metadata: { x: 1 } };
jest.mock('../../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: mockLoja.id, storeSlug: mockLoja.slug, store: mockLoja }),
}));

import { PromocaoDoDiaPage } from '../PromocaoDoDiaPage';
import { explicarMotivo, validarConfig, CONFIG_PADRAO } from '../promoDoDia';
import { useRootStore } from '../../../../stores/rootStore';

const PAINEL = {
  config: { ...CONFIG_PADRAO, cards: { '1': 'https://x/terca.png' } },
  previa: { dia: '2026-09-29', weekday: 1, quando: 'Amanhã (terça)', ofertas: [{ nome: 'Basic Lombo', preco: 'R$ 30,75', de: 'R$ 40,99' }], card: 'https://x/terca.png', texto: 'Oi, {nome}! Amanhã (terça) tem oferta', modo: 'janela' },
  modelos: ['oferta_do_dia'],
  historico: [{ id: 'c1', nome: 'Promoção do dia — Amanhã (terça) 2026-09-29', dia: '2026-09-29', modo: 'janela', status: 'scheduled', criada_em: '2026-09-28T21:00:00Z', enviadas: 12, destinatarios: 40 }],
  tem_whatsapp: true,
};

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><PromocaoDoDiaPage /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  jest.clearAllMocks();
  painel.mockResolvedValue(PAINEL);
  mockLoja = { id: 's1', slug: 'loja-x', metadata: { x: 1 } };
  act(() => useRootStore.getState().setStores([mockLoja as never]));
  salvarLoja.mockImplementation(async (_id: string, dados: { metadata: Record<string, unknown> }) => ({ ...mockLoja, metadata: dados.metadata }));
});

describe('PromocaoDoDiaPage', () => {
  it('mostra prévia com o card, o histórico e liga o envio automático gravando no metadata', async () => {
    renderizar();
    expect(await screen.findByAltText('Card do dia')).toBeInTheDocument();
    expect(screen.getByAltText('Card do dia')).toHaveAttribute('src', 'https://x/terca.png');
    expect(screen.getAllByText('12 de 40').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('switch', { name: /enviar a promoção do dia automaticamente/i }));
    await waitFor(() => expect(salvarLoja).toHaveBeenCalled());
    const meta = salvarLoja.mock.calls[0][1].metadata;
    expect(meta.x).toBe(1);
    expect(meta.promo_do_dia.ativo).toBe(true);
    expect(meta.promo_do_dia.cards).toEqual({ '1': 'https://x/terca.png' });
    expect(toast.success.mock.calls[0][0]).toMatch(/18:00/);
  });

  it('subir o card de quarta faz upload e grava a url no dia 2', async () => {
    upload.mockResolvedValue({ media_url: 'https://x/quarta.png', media_type: 'image', filename: 'q.png', mime_type: 'image/png' });
    renderizar();
    await screen.findByAltText('Card do dia');
    const input = screen.getByLabelText('Escolher card de Quarta') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'q.png', { type: 'image/png' })] } });
    await waitFor(() => expect(salvarLoja).toHaveBeenCalled());
    expect(salvarLoja.mock.calls[0][1].metadata.promo_do_dia.cards['2']).toBe('https://x/quarta.png');
  });

  it('"Enviar agora" explica o motivo do backend', async () => {
    dispararAgora.mockResolvedValue({ motivo: 'sem_promocao', campanha_id: null });
    renderizar();
    await screen.findByAltText('Card do dia');
    fireEvent.click(screen.getByRole('button', { name: /enviar agora/i }));
    await waitFor(() => expect(dispararAgora).toHaveBeenCalledWith('loja-x'));
    expect(toast.error.mock.calls[0][0]).toMatch(/não há promoção/i);
  });
});

describe('regras puras', () => {
  it('valida hora e modelo', () => {
    expect(validarConfig({ ...CONFIG_PADRAO, hora: '23:00' })).toMatch(/entre 08:00 e 21:00/);
    expect(validarConfig({ ...CONFIG_PADRAO, modo: 'modelo', modelo: '' })).toMatch(/modelo/i);
    expect(validarConfig(CONFIG_PADRAO)).toBe('');
  });
  it('explica os motivos', () => {
    expect(explicarMotivo('ja_saiu').ok).toBe(false);
    expect(explicarMotivo('janela').ok).toBe(true);
  });
});
