/**
 * Conversão do bot: os números do funil e a lista de onde a venda parou.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const buscar = jest.fn();
jest.mock('../../../services/atendimentoBot', () => ({
  __esModule: true,
  conversaoDoBotService: { buscar: (...a: unknown[]) => buscar(...a) },
}));
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'uuid-1', storeSlug: 'loja-1', store: { id: 'uuid-1', slug: 'loja-1' } }),
}));

import { ConversaoDoBotPage, motivoDeAtendente } from '../ConversaoDoBotPage';

const DADOS = {
  dias: 30, conversas: 186, pedidos: 10, receita: '404.39', taxa: 5.4,
  para_atendente: 145, carrinho_parado: 16, bot_falhou: 51,
  motivos_de_atendente: [
    { motivo: 'Respondido pelo WhatsApp do celular', vezes: 77 },
    { motivo: 'A IA não conseguiu responder', vezes: 7 },
  ],
  serie: Array.from({ length: 30 }, (_, i) => ({ dia: `2026-09-${String(i + 1).padStart(2, '0')}`, conversas: 6, pedidos: 0 })),
  perdidas: [
    { conversa_id: 'c1', telefone: '5563999990402', nome: 'Bia', quando: '2026-09-28T15:00:00Z', motivo: 'atendente', ultima_mensagem: 'falar com alguém' },
    { conversa_id: 'c2', telefone: '5563999990403', nome: '', quando: '2026-09-28T14:00:00Z', motivo: 'carrinho', ultima_mensagem: '1 frango' },
  ],
};

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><ConversaoDoBotPage /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  jest.clearAllMocks();
  buscar.mockResolvedValue(DADOS);
});

describe('ConversaoDoBotPage', () => {
  it('mostra o funil, os motivos traduzidos e onde a venda parou', async () => {
    renderizar();
    expect(await screen.findByText('10 (5.4%)')).toBeInTheDocument();
    expect(buscar).toHaveBeenCalledWith({ store: 'loja-1', dias: 30 });
    expect(screen.getByText('186')).toBeInTheDocument();
    expect(screen.getByText('Você respondeu pelo celular')).toBeInTheDocument();
    expect(screen.getByText('77 vezes')).toBeInTheDocument();
    expect(screen.getAllByText('Foi para atendente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Deixou o carrinho').length).toBeGreaterThan(0);
    expect(screen.getAllByText('falar com alguém').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /abrir conversa/i })[0]).toHaveAttribute('href', '/inbox/whatsapp?conversa=c1');
  });

  it('trocar o período busca de novo', async () => {
    renderizar();
    await screen.findByText('186');
    fireEvent.click(screen.getByRole('tab', { name: /90 dias/i }));
    await waitFor(() => expect(buscar).toHaveBeenLastCalledWith({ store: 'loja-1', dias: 90 }));
  });

  it('falha ao carregar não vira zero', async () => {
    buscar.mockRejectedValue(new Error('500'));
    renderizar();
    expect(await screen.findByText(/não consegui carregar/i)).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});

describe('motivoDeAtendente', () => {
  it('traduz o que o sistema grava; desconhecido passa como está', () => {
    expect(motivoDeAtendente('Synced from conversation mode switch')).toBe('Trocado para humano no painel');
    expect(motivoDeAtendente('')).toBe('Sem motivo registrado');
    expect(motivoDeAtendente('Cliente pediu')).toBe('Cliente pediu');
  });
});
