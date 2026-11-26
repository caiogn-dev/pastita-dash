/**
 * "Loja no iFood" (módulo Merchant): status, pausas e horários da loja no iFood.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const get = jest.fn();
const post = jest.fn();
const put = jest.fn();
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a),
  },
}));
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { LojaNoIfood } from '../LojaNoIfood';

const params = { params: { store: 'id-1' } };
const toast = () => jest.requireMock('react-hot-toast').default;

const loja = (over: Record<string, unknown> = {}) => ({
  status: { estado: 'OK', aberta: true, titulo: '', detalhe: '' },
  pausas: [],
  horarios: [
    { dia: 'MONDAY', inicio: '11:00', fim: '15:00' },
    { dia: 'MONDAY', inicio: '18:00', fim: '22:00' },
    { dia: 'TUESDAY', inicio: '11:00', fim: '15:00' },
  ],
  ...over,
});

const renderizar = async () => {
  render(<LojaNoIfood storeId="id-1" />);
  return screen.findByRole('region', { name: 'Loja no iFood' });
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
  toast().error.mockReset();
  toast().success.mockReset();
});

it('busca a loja no iFood ao abrir e mostra "Aberta"', async () => {
  get.mockResolvedValue({ data: loja() });
  const bloco = await renderizar();
  expect(await within(bloco).findByText('Aberta')).toBeInTheDocument();
  expect(get).toHaveBeenCalledWith('/stores/integracoes/ifood/loja/', params);
});

it('fechada mostra título e detalhe', async () => {
  get.mockResolvedValue({ data: loja({ status: { estado: 'CLOSED', aberta: false, titulo: 'Fora do horário', detalhe: 'Abre às 11:00' } }) });
  const bloco = await renderizar();
  expect(await within(bloco).findByText('Fechada')).toBeInTheDocument();
  expect(within(bloco).getByText('Fora do horário')).toBeInTheDocument();
  expect(within(bloco).getByText('Abre às 11:00')).toBeInTheDocument();
});

it('WARNING sem estar aberta vira "Atenção"', async () => {
  get.mockResolvedValue({ data: loja({ status: { estado: 'WARNING', aberta: false, titulo: 'Sem cardápio', detalhe: '' } }) });
  const bloco = await renderizar();
  expect(await within(bloco).findByText('Atenção')).toBeInTheDocument();
  expect(within(bloco).getByText('Sem cardápio')).toBeInTheDocument();
});

it('erro ao carregar vira toast com o motivo', async () => {
  get.mockRejectedValue('Loja não encontrada no iFood');
  await renderizar();
  await waitFor(() => expect(toast().error).toHaveBeenCalledWith('Loja não encontrada no iFood'));
});

it('atualizar refaz o GET', async () => {
  get.mockResolvedValue({ data: loja() });
  const bloco = await renderizar();
  await within(bloco).findByText('Aberta');
  fireEvent.click(within(bloco).getByRole('button', { name: 'Atualizar' }));
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
});

describe('pausas', () => {
  it.each([['15 min', 15], ['30 min', 30], ['1 h', 60], ['2 h', 120]])('pausar %s envia %i minutos', async (rotulo, minutos) => {
    get.mockResolvedValue({ data: loja() });
    post.mockResolvedValue({ data: loja() });
    const bloco = await renderizar();
    await within(bloco).findByText('Aberta');
    fireEvent.click(within(bloco).getByRole('button', { name: rotulo }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/stores/integracoes/ifood/loja/pausar/', { minutos }, params));
  });

  it('pausa ativa aparece com "Retomar", que envia o id', async () => {
    const pausada = loja({
      status: { estado: 'CLOSED', aberta: false, titulo: 'Pausada', detalhe: '' },
      pausas: [{ id: 'pz-1', motivo: 'Cozinha cheia', inicio: '2026-11-19T15:00:00Z', fim: '2026-11-19T15:30:00Z' }],
    });
    get.mockResolvedValue({ data: pausada });
    post.mockResolvedValue({ data: loja() });
    const bloco = await renderizar();
    const lista = await within(bloco).findByRole('list', { name: 'Pausas' });
    expect(within(lista).getByText('Cozinha cheia')).toBeInTheDocument();
    fireEvent.click(within(lista).getByRole('button', { name: 'Retomar' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/stores/integracoes/ifood/loja/retomar/', { id: 'pz-1' }, params));
    expect(await within(bloco).findByText('Aberta')).toBeInTheDocument();
    expect(within(bloco).queryByRole('list', { name: 'Pausas' })).toBeNull();
  });

  it('erro ao pausar vira toast', async () => {
    get.mockResolvedValue({ data: loja() });
    post.mockRejectedValue('Pausa recusada');
    const bloco = await renderizar();
    await within(bloco).findByText('Aberta');
    fireEvent.click(within(bloco).getByRole('button', { name: '30 min' }));
    await waitFor(() => expect(toast().error).toHaveBeenCalledWith('Pausa recusada'));
  });
});

describe('horários', () => {
  const abrir = async () => {
    get.mockResolvedValue({ data: loja() });
    const bloco = await renderizar();
    await within(bloco).findByText('Aberta');
    return bloco;
  };

  it('mostra os turnos por dia, vários no mesmo dia', async () => {
    const bloco = await abrir();
    expect((within(bloco).getByLabelText('Segunda, turno 1, início') as HTMLInputElement).value).toBe('11:00');
    expect((within(bloco).getByLabelText('Segunda, turno 2, fim') as HTMLInputElement).value).toBe('22:00');
    expect(within(bloco).getByLabelText('Segunda, turno 1, início')).toHaveAttribute('type', 'time');
    expect(within(bloco).queryByLabelText('Quarta, turno 1, início')).toBeNull();
    ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].forEach((d) =>
      expect(within(bloco).getByText(d)).toBeInTheDocument());
    expect(within(bloco).getByRole('button', { name: 'Salvar horários' })).toBeDisabled();
  });

  it('adicionar e remover turno, depois salvar envia tudo', async () => {
    const bloco = await abrir();
    fireEvent.click(within(bloco).getByRole('button', { name: 'Adicionar turno na quarta' }));
    fireEvent.change(within(bloco).getByLabelText('Quarta, turno 1, início'), { target: { value: '10:00' } });
    fireEvent.change(within(bloco).getByLabelText('Quarta, turno 1, fim'), { target: { value: '14:30' } });
    fireEvent.click(within(bloco).getByRole('button', { name: 'Remover segunda, turno 2' }));
    put.mockResolvedValue({ data: loja({ horarios: [] }) });
    fireEvent.click(within(bloco).getByRole('button', { name: 'Salvar horários' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/stores/integracoes/ifood/loja/horarios/', {
      horarios: [
        { dia: 'MONDAY', inicio: '11:00', fim: '15:00' },
        { dia: 'TUESDAY', inicio: '11:00', fim: '15:00' },
        { dia: 'WEDNESDAY', inicio: '10:00', fim: '14:30' },
      ],
    }, params));
    expect(toast().success).toHaveBeenCalled();
  });

  it('fim antes do início não chama o servidor', async () => {
    const bloco = await abrir();
    fireEvent.change(within(bloco).getByLabelText('Terça, turno 1, fim'), { target: { value: '10:00' } });
    fireEvent.click(within(bloco).getByRole('button', { name: 'Salvar horários' }));
    expect(put).not.toHaveBeenCalled();
    expect(toast().error).toHaveBeenCalledWith(expect.stringContaining('Terça'));
    expect(within(bloco).getByLabelText('Terça, turno 1, fim')).toHaveAttribute('aria-invalid', 'true');
  });

  it('erro do servidor ao salvar vira toast', async () => {
    const bloco = await abrir();
    put.mockRejectedValue('Horário recusado pelo iFood');
    fireEvent.click(within(bloco).getByRole('button', { name: 'Remover terça, turno 1' }));
    fireEvent.click(within(bloco).getByRole('button', { name: 'Salvar horários' }));
    await waitFor(() => expect(toast().error).toHaveBeenCalledWith('Horário recusado pelo iFood'));
  });
});

describe('RedeNoIfood', () => {
  const { RedeNoIfood } = jest.requireActual('../LojaNoIfood') as typeof import('../LojaNoIfood');
  beforeEach(() => { get.mockReset(); post.mockReset(); });

  it('com várias marcas, pausa vai para a marca escolhida', async () => {
    get.mockImplementation((url: string) => Promise.resolve({
      data: url.endsWith('/rede/')
        ? { marcas: [
          { id: 'principal', nome: 'Agrião', status: { aberta: true } },
          { id: 'santa', nome: 'Santa Parmê', status: { aberta: false } },
        ] }
        : loja(),
    }));
    post.mockResolvedValue({ data: loja() });
    render(<RedeNoIfood storeId="id-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: /Santa Parmê/ }));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/stores/integracoes/ifood/loja/', { params: { store: 'id-1', marca: 'santa' } }));
    const pausar = await screen.findByRole('group', { name: 'Pausar' });
    fireEvent.click(within(pausar).getAllByRole('button')[0]);
    await waitFor(() => expect(post.mock.calls[0][2]).toEqual({ params: { store: 'id-1', marca: 'santa' } }));
  });

  it('uma marca só não mostra seletor', async () => {
    get.mockImplementation((url: string) => Promise.resolve({
      data: url.endsWith('/rede/') ? { marcas: [{ id: 'p', nome: 'Cê', status: { aberta: true } }] } : loja(),
    }));
    render(<RedeNoIfood storeId="id-1" />);
    await screen.findByRole('group', { name: 'Pausar' });
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});
