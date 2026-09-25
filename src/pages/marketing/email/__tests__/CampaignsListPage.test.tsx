/**
 * Lista de campanhas de e-mail com o mesmo desenho da do WhatsApp: números,
 * tabela com selo de estado, ações no menu da linha, vazio que diz o que fazer.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import CampaignsListPage from '../CampaignsListPage';

const navegar = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navegar,
}));

const get = jest.fn();
const post = jest.fn();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    delete: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock('../../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'loja-1' }),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const agora = new Date().toISOString();
const base = { audience_type: 'all', scheduled_at: null, completed_at: null, created_at: agora, emails_clicked: 0 };
const CAMPANHAS = [
  { ...base, id: 'e1', name: 'Cupom de setembro', subject: '10% hoje', status: 'sent', started_at: agora, completed_at: agora,
    total_recipients: 200, emails_sent: 200, emails_delivered: 180, emails_opened: 90, emails_clicked: 18 },
  { ...base, id: 'e2', name: 'Rascunho de natal', subject: 'Natal', status: 'draft', started_at: null,
    total_recipients: 0, emails_sent: 0, emails_delivered: 0, emails_opened: 0 },
  { ...base, id: 'e3', name: 'Semana do hambúrguer', subject: 'Chegou', status: 'scheduled', started_at: null,
    scheduled_at: '2099-02-01T12:00:00Z', total_recipients: 150, emails_sent: 0, emails_delivered: 0, emails_opened: 0 },
];

// userEvent + menu da linha: com a máquina carregada, 5 s não bastam.
jest.setTimeout(20000);

const tela = () => render(<MemoryRouter><CampaignsListPage /></MemoryRouter>);

beforeEach(() => {
  navegar.mockReset();
  post.mockReset().mockResolvedValue({ data: { sent: 3 } });
  get.mockReset().mockResolvedValue({ data: { results: CAMPANHAS } });
});

it('mostra os números que importam', async () => {
  tela();
  const numeros = await screen.findByRole('region', { name: 'Números das campanhas' });

  expect(within(numeros).getByText('Enviados no mês')).toBeInTheDocument();
  expect(within(numeros).getByText('200')).toBeInTheDocument();
  // Abertura sobre entregues: 90 de 180 = 50%.
  expect(within(numeros).getByText('Abertura')).toBeInTheDocument();
  expect(within(numeros).getByText('50%')).toBeInTheDocument();
  // Cliques sobre abertos: 18 de 90 = 20%.
  expect(within(numeros).getByText('Cliques')).toBeInTheDocument();
  expect(within(numeros).getByText('20%')).toBeInTheDocument();
  expect(within(numeros).getByText('Agendadas')).toBeInTheDocument();
  expect(within(numeros).getByText('1')).toBeInTheDocument();
});

it('uma tabela com o estado no selo do kit e a abertura em barra', async () => {
  tela();
  const secao = await screen.findByRole('region', { name: 'Campanhas' });

  expect(within(secao).getAllByText('Enviada')[0].className).toMatch(/--success/);
  expect(within(secao).getAllByText('Rascunho')[0].className).not.toMatch(/--(success|danger|warning|info)/);
  expect(within(secao).getAllByText('Agendada')[0].className).toMatch(/--info/);
  expect(screen.getAllByRole('progressbar', { name: 'Abertos em Cupom de setembro' })[0])
    .toHaveAttribute('aria-valuenow', '50');
});

it('rascunho se envia pelo menu da linha, com confirmação', async () => {
  tela();
  await screen.findAllByText('Rascunho de natal');

  await userEvent.click(screen.getAllByRole('button', { name: 'Ações de Rascunho de natal' })[0]);
  await userEvent.click(screen.getByRole('menuitem', { name: 'Enviar agora' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Enviar campanha' }));

  expect(post).toHaveBeenCalledWith('/marketing/campaigns/e2/send/');
});

it('sem campanha, o vazio diz o que fazer', async () => {
  get.mockResolvedValue({ data: { results: [] } });
  tela();

  expect(await screen.findByText('Nenhuma campanha de e-mail ainda')).toBeInTheDocument();
  const criar = screen.getAllByRole('button', { name: /Criar campanha/ });
  await userEvent.click(criar[criar.length - 1]);
  expect(navegar).toHaveBeenCalledWith('/marketing/email/new');
});

it('falha de carga não vira "nenhuma campanha"', async () => {
  get.mockRejectedValue(new Error('rede'));
  tela();

  expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível carregar as campanhas/);
  expect(screen.queryByText('Nenhuma campanha de e-mail ainda')).toBeNull();
});
