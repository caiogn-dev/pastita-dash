/**
 * Widget do iFood na barra do topo: status da loja no iFood e pausa em 1 clique,
 * de qualquer tela. Pedido do dono (20/11): "vou ter que ir na página de
 * integrações para pausar a loja do iFood?".
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const get = jest.fn();
const post = jest.fn();
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { MemoryRouter } from 'react-router-dom';
import { IfoodNoTopo as Widget } from '../IfoodNoTopo';

const IfoodNoTopo: React.FC<{ storeSlug: string | null }> = (p) => <MemoryRouter><Widget {...p} /></MemoryRouter>;

const aberta = { status: { estado: 'OK', aberta: true, titulo: 'Loja aberta', detalhe: '' }, pausas: [], horarios: [] };
const fimDaPausa = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const pausada = {
  status: { estado: 'CLOSED', aberta: false, titulo: 'Loja fechada', detalhe: 'Em Pausa programada' },
  pausas: [{ id: 'p-1', motivo: 'Pausa pelo Cardapidex', inicio: new Date().toISOString(), fim: fimDaPausa }],
  horarios: [],
};
const params = { params: { store: 'loja-1' } };

beforeEach(() => { get.mockReset(); post.mockReset(); });

describe('IfoodNoTopo', () => {
  it('loja sem iFood: não mostra nada', async () => {
    get.mockRejectedValue({ response: { status: 400 } });
    render(<IfoodNoTopo storeSlug="loja-1" />);
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stores/integracoes/ifood/loja/', params));
    expect(screen.queryByRole('button', { name: /iFood/ })).not.toBeInTheDocument();
  });

  it('sem loja: nem consulta', () => {
    render(<IfoodNoTopo storeSlug={null} />);
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /iFood/ })).not.toBeInTheDocument();
  });

  it('loja aberta: selo "Aberta" e pausa em 1 clique', async () => {
    get.mockResolvedValue({ data: aberta });
    post.mockResolvedValue({ data: pausada });
    render(<IfoodNoTopo storeSlug="loja-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /iFood: Aberta/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '30 min' })); });
    expect(post).toHaveBeenCalledWith('/stores/integracoes/ifood/loja/pausar/', { minutos: 30 }, params);
    expect(await screen.findByRole('button', { name: /iFood: Pausada/i })).toBeInTheDocument();
  });

  it('loja pausada: mostra até quando e reabre removendo as pausas', async () => {
    get.mockResolvedValue({ data: pausada });
    post.mockResolvedValue({ data: aberta });
    render(<IfoodNoTopo storeSlug="loja-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /iFood: Pausada/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reabrir agora' })); });
    expect(post).toHaveBeenCalledWith('/stores/integracoes/ifood/loja/retomar/', { id: 'p-1' }, params);
    expect(await screen.findByRole('button', { name: /iFood: Aberta/i })).toBeInTheDocument();
  });

  it('fechada sem pausa (fora do horário): diz por quê', async () => {
    get.mockResolvedValue({ data: { ...aberta, status: { estado: 'CLOSED', aberta: false, titulo: 'Loja fechada', detalhe: 'Fora do horário de funcionamento' } } });
    render(<IfoodNoTopo storeSlug="loja-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /iFood: Fechada/i }));
    expect(screen.getByText('Fora do horário de funcionamento')).toBeInTheDocument();
  });
});
