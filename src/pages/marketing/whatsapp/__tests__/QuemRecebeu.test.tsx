/**
 * O relatório da campanha diz QUEM recebeu, falhou ou ficou de fora — e por quê.
 *
 * Até 19/09 ele mostrava só contagens: a campanha de 18/09 aparecia como
 * "28 destinatários" sem nenhuma menção aos 352 que ficaram de fora, e as
 * falhas vinham com um chute ("quase sempre número inválido").
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuemRecebeu } from '../QuemRecebeu';
import { PediramParaParar } from '../PediramParaParar';

const getDestinatarios = jest.fn();
const getSaidas = jest.fn();
jest.mock('../../../../services/campaigns', () => ({
  __esModule: true,
  campaignsService: {
    getDestinatarios: (...a: unknown[]) => getDestinatarios(...a),
    getSaidas: (...a: unknown[]) => getSaidas(...a),
  },
}));

const pessoas = [
  { id: '1', nome: 'Ana', telefone: '5563999990001', situacao: 'leu', motivo: 'Recebeu e leu.', quando: null },
  { id: '2', nome: 'Bia', telefone: '5563999990002', situacao: 'ficou_de_fora',
    motivo: 'Fora da janela de 24h: não falou com a loja nas últimas 24h.', quando: null },
  { id: '3', nome: 'Caio', telefone: '5563999990003', situacao: 'falhou',
    motivo: 'A Meta segurou: esta pessoa já recebeu muitas promoções.', quando: null },
];

beforeEach(() => {
  getDestinatarios.mockReset();
  getSaidas.mockReset();
  getDestinatarios.mockResolvedValue({
    resumo: { leu: 1, recebeu: 0, falhou: 1, ficou_de_fora: 352, na_fila: 0 }, pessoas,
  });
});

describe('QuemRecebeu', () => {
  it('mostra quantos ficaram de fora — não só quem entrou', async () => {
    render(<QuemRecebeu campaignId="c1" />);
    expect(await screen.findByRole('tab', { name: /ficaram de fora.*352/i })).toBeInTheDocument();
  });

  it('lista as pessoas com o motivo em português', async () => {
    render(<QuemRecebeu campaignId="c1" />);
    fireEvent.click(await screen.findByRole('tab', { name: /ficaram de fora/i }));
    expect(await screen.findByText('Bia')).toBeInTheDocument();
    expect(screen.getByText(/janela de 24h/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /falharam/i }));
    expect(await screen.findByText(/Meta segurou/)).toBeInTheDocument();
  });

  it('a aba filtra a lista pela situação', async () => {
    render(<QuemRecebeu campaignId="c1" />);
    fireEvent.click(await screen.findByRole('tab', { name: /falharam/i }));
    await waitFor(() => expect(screen.queryByText('Ana')).not.toBeInTheDocument());
    expect(screen.getByText('Caio')).toBeInTheDocument();
  });

  it('falha ao carregar avisa em vez de mostrar lista vazia', async () => {
    getDestinatarios.mockRejectedValue(new Error('500'));
    render(<QuemRecebeu campaignId="c1" />);
    expect(await screen.findByText(/não foi possível carregar/i)).toBeInTheDocument();
  });
});

describe('PediramParaParar', () => {
  it('mostra o número real de quem saiu da lista', async () => {
    getSaidas.mockResolvedValue({
      total: 11,
      pessoas: [{ nome: 'Dora', telefone: '5563999990004', quando: '2026-08-28T21:40:00Z', origem: 'button', texto: 'Parar promoções' }],
    });
    render(<PediramParaParar />);
    expect(await screen.findByText('11')).toBeInTheDocument();
  });

  it('abre a lista de quem pediu para parar', async () => {
    getSaidas.mockResolvedValue({
      total: 1,
      pessoas: [{ nome: 'Dora', telefone: '5563999990004', quando: '2026-08-28T21:40:00Z', origem: 'button', texto: 'Parar promoções' }],
    });
    render(<PediramParaParar />);
    fireEvent.click(await screen.findByRole('button', { name: /ver quem/i }));
    expect(await screen.findByText('Dora')).toBeInTheDocument();
    expect(screen.getByText(/apertou "Parar promoções"/i)).toBeInTheDocument();
  });
});
