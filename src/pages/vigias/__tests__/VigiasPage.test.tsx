/**
 * Vigias: ligar, escolher quem recebe e quando, ligar/desligar cada vigia,
 * ver a prévia como chega no WhatsApp, testar e dar 👍/👎 no histórico.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
const toast = jest.requireMock('react-hot-toast').default as { success: jest.Mock; error: jest.Mock };

jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));

const painel = jest.fn();
const salvar = jest.fn();
const avisos = jest.fn();
const previa = jest.fn();
const testar = jest.fn();
const marcarUtil = jest.fn();
const pedirModelo = jest.fn();
jest.mock('../../../services/vigias', () => {
  const real = jest.requireActual('../../../services/vigias');
  return {
    __esModule: true,
    ...real,
    vigiasService: {
      painel: (...a: unknown[]) => painel(...a),
      salvar: (...a: unknown[]) => salvar(...a),
      avisos: (...a: unknown[]) => avisos(...a),
      previa: (...a: unknown[]) => previa(...a),
      testar: (...a: unknown[]) => testar(...a),
      marcarUtil: (...a: unknown[]) => marcarUtil(...a),
      pedirModelo: (...a: unknown[]) => pedirModelo(...a),
    },
  };
});
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 's1', storeSlug: 'ce-saladas', store: { id: 's1', slug: 'ce-saladas' } }),
}));

import { VigiasPage } from '../VigiasPage';
import { explicarCanal, formatarTelefone, type PainelDosVigias } from '../../../services/vigias';

const CATALOGO = [
  { tipo: 'resumo', nome: 'Resumo do dia', icone: 'sunrise', quando: 'Toda manhã', exemplo: 'Ontem: 18 pedidos' },
  { tipo: 'sabor_em_queda', nome: 'Sabor em queda', icone: 'trending-down', quando: 'Só se acontecer', exemplo: 'Almôndega caiu' },
] as PainelDosVigias['catalogo'];

const base = (config: Partial<PainelDosVigias['config']> = {}, canal: Partial<PainelDosVigias['canal']> = {}): PainelDosVigias => ({
  config: {
    ativo: true, pausado: false, pausado_em: null, telefone: '5563999112233',
    hora_resumo: '08:00', hora_alerta: '12:30', dias: [0, 1, 2, 3, 4], desligados: [], ...config,
  },
  catalogo: CATALOGO,
  canal: { whatsapp_conectado: true, modelo: 'aprovado', conversa_aberta: false, ...canal },
  ultimo_envio: null,
});

const AVISOS = [
  {
    id: 'a1', tipo: 'resumo', titulo: 'Resumo de qui 15/10', texto: 'Ontem: 15 pedidos, R$ 884,35',
    prioridade: 10, dados: {}, util: null, criado_em: '2026-10-16T11:00:00Z',
    envio: { id: 'e1', dia: '2026-10-16', turno: 'manha', status: 'enviado', canal: 'modelo', erro: '', criado_em: '2026-10-16T11:00:00Z' },
  },
  {
    id: 'a2', tipo: 'sabor_em_queda', titulo: 'Almôndega em queda', texto: 'Almôndega: 1 vendida; o normal seria ~8',
    prioridade: 7, dados: {}, util: null, criado_em: '2026-10-16T11:00:00Z',
    envio: { id: 'e1', dia: '2026-10-16', turno: 'manha', status: 'so_painel', canal: 'painel', erro: 'Sem telefone do dono configurado.', criado_em: '2026-10-16T11:00:00Z' },
  },
];

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><VigiasPage /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  jest.clearAllMocks();
  painel.mockResolvedValue(base());
  salvar.mockImplementation(async (_l: string, m: Partial<PainelDosVigias['config']>) => base(m));
  avisos.mockResolvedValue(AVISOS);
  previa.mockResolvedValue({ fatos: [{ tipo: 'resumo' }], mensagem: '📊 *Vigia da Cê Saladas* — sex 16/10\n\n• Ontem: 15 pedidos', dia: 'sex 16/10' });
  testar.mockResolvedValue({ status: 'enviado', canal: 'modelo', erro: '' });
  marcarUtil.mockImplementation(async (_l: string, id: string, util: boolean | null) => ({ ...AVISOS.find((a) => a.id === id), util }));
});

describe('VigiasPage', () => {
  it('mostra os vigias, o canal e a prévia como chega no WhatsApp', async () => {
    renderizar();
    expect(await screen.findByText('Resumo do dia')).toBeInTheDocument();
    expect(screen.getByText('Sabor em queda')).toBeInTheDocument();
    expect(screen.getByText('Chega todo dia no WhatsApp')).toBeInTheDocument();
    const balao = await screen.findByLabelText('Prévia da mensagem no WhatsApp');
    expect(within(balao).getByText('Vigia da Cê Saladas').tagName).toBe('STRONG');
    expect(screen.getByDisplayValue('(63) 99911-2233')).toBeInTheDocument();
  });

  it('desligar um vigia grava a lista de desligados', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('switch', { name: 'Sabor em queda' }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('ce-saladas', { desligados: ['sabor_em_queda'] }));
  });

  it('dia de loja aberta liga e desliga, mas não deixa zerar com vigia ligado', async () => {
    painel.mockResolvedValue(base({ dias: [4] }));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: 'sexta' }));
    expect(salvar).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Escolha pelo menos um dia.');

    fireEvent.click(screen.getByRole('button', { name: 'sábado' }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('ce-saladas', { dias: [4, 5] }));
  });

  it('celular é gravado ao sair do campo, só com dígitos', async () => {
    painel.mockResolvedValue(base({ telefone: '' }));
    renderizar();
    const campo = await screen.findByLabelText('Celular que recebe');
    fireEvent.change(campo, { target: { value: '(63) 98888-7777' } });
    fireEvent.blur(campo);
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('ce-saladas', { telefone: '63988887777' }));
  });

  it('e-mail que recebe a cópia é gravado ao sair do campo (do Prefiro)', async () => {
    painel.mockResolvedValue(base({ telefone: '' }));
    renderizar();
    const campo = await screen.findByLabelText('E-mail que recebe (opcional)');
    fireEvent.change(campo, { target: { value: ' dono@loja.com ' } });
    fireEvent.blur(campo);
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('ce-saladas', { email: 'dono@loja.com' }));
  });

  it('erro de validação do servidor volta ao estado anterior e diz o motivo', async () => {
    salvar.mockRejectedValue({ response: { data: { error: 'Confira os campos.', campos: { telefone: 'Use DDD + número, ex.: (63) 99999-0000.' } } } });
    painel.mockResolvedValue(base({ telefone: '' }));
    renderizar();
    const campo = await screen.findByLabelText('Celular que recebe');
    fireEvent.change(campo, { target: { value: '123' } });
    fireEvent.blur(campo);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Use DDD + número, ex.: (63) 99999-0000.'));
  });

  it('desligado vende o recurso e liga com um clique', async () => {
    painel.mockResolvedValue(base({ ativo: false }));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: 'Ligar vigias' }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('ce-saladas', { ativo: true }));
  });

  it('histórico por dia, com o que chegou e o que ficou só no painel', async () => {
    renderizar();
    expect(await screen.findByText('Ontem: 15 pedidos, R$ 884,35')).toBeInTheDocument();
    expect(screen.getByText('Enviado no WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Só no painel')).toBeInTheDocument();
    expect(screen.getByText('Sem telefone do dono configurado.')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Aviso útil' })[0]);
    await waitFor(() => expect(marcarUtil).toHaveBeenCalledWith('ce-saladas', 'a1', true));
  });

  it('enviar teste: sucesso e falha com o motivo', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Enviar teste/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    testar.mockResolvedValue({ status: 'so_painel', canal: 'painel', erro: 'A loja não tem WhatsApp conectado.' });
    fireEvent.click(screen.getByRole('button', { name: /Enviar teste/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A loja não tem WhatsApp conectado.', expect.anything()));
  });

  it('sem modelo aprovado oferece pedir aprovação à Meta', async () => {
    painel.mockResolvedValue(base({}, { modelo: 'ausente' }));
    pedirModelo.mockResolvedValue({ modelo: 'pendente' });
    renderizar();
    expect(await screen.findByText('Por enquanto, só aqui no painel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pedir aprovação à Meta' }));
    await waitFor(() => expect(pedirModelo).toHaveBeenCalledWith('ce-saladas'));
  });

  it('falha ao carregar não finge que está tudo desligado', async () => {
    painel.mockRejectedValue(new Error('rede'));
    renderizar();
    expect(await screen.findByText('Não consegui carregar os vigias.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ligar vigias' })).not.toBeInTheDocument();
  });

  it('histórico vazio diz que não há aviso, e falha do histórico não vira vazio', async () => {
    avisos.mockResolvedValue([]);
    const { unmount } = renderizar();
    expect(await screen.findByText('Nenhum aviso ainda')).toBeInTheDocument();
    unmount();

    avisos.mockRejectedValue(new Error('rede'));
    renderizar();
    expect(await screen.findByText('Não consegui carregar o histórico.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum aviso ainda')).not.toBeInTheDocument();
  });
});

describe('regras de exibição', () => {
  it('formata o celular com ou sem DDI', () => {
    expect(formatarTelefone('5563999112233')).toBe('(63) 99911-2233');
    expect(formatarTelefone('6332145566')).toBe('(63) 3214-5566');
    expect(formatarTelefone('')).toBe('');
  });

  it('explica o canal na língua do lojista', () => {
    const c = (canal: Partial<PainelDosVigias['canal']>, tel = '55639') => explicarCanal({ whatsapp_conectado: true, modelo: 'ausente', conversa_aberta: false, ...canal }, tel);
    expect(c({ whatsapp_conectado: false }).acao).toBe('conectar');
    expect(c({}, '').acao).toBe('telefone');
    expect(c({ modelo: 'aprovado' }).tom).toBe('success');
    expect(c({ modelo: 'pendente' }).texto).toMatch(/aprovação/);
    expect(c({ conversa_aberta: true }).texto).toMatch(/24 h/);
  });
});
