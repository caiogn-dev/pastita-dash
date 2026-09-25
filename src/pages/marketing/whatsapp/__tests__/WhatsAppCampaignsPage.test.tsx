/**
 * Lista de campanhas do WhatsApp, simples: quatro números que importam, uma
 * tabela com o estado de cada campanha e as ações no menu da linha.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import WhatsAppCampaignsPage from '../WhatsAppCampaignsPage';

const navegar = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navegar,
}));

const getCampaigns = jest.fn();
const pauseCampaign = jest.fn();
jest.mock('../../../../services/campaigns', () => ({
  __esModule: true,
  campaignsService: {
    getCampaigns: (...a: unknown[]) => getCampaigns(...a),
    pauseCampaign: (...a: unknown[]) => pauseCampaign(...a),
    startCampaign: jest.fn().mockResolvedValue({}),
    resumeCampaign: jest.fn().mockResolvedValue({}),
    cancelCampaign: jest.fn().mockResolvedValue({}),
    getCampaignStats: jest.fn().mockResolvedValue(null),
    getCampaignRecipients: jest.fn().mockResolvedValue([]),
    getSaidas: jest.fn().mockResolvedValue({ total: 0, pessoas: [] }),
    getFaixasDaCampanha: jest.fn().mockResolvedValue({ faixas: [], proxima_faixa: null, fora_da_janela: 0 }),
    getDestinatarios: jest.fn().mockResolvedValue({ results: [] }),
  },
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const agora = new Date().toISOString();
const base = {
  account: 'a', description: '', campaign_type: 'broadcast', template: null, message_content: {},
  audience_type: 'all', audience_filters: {}, messages_per_minute: 60, delay_between_seconds: 1,
  delivery_rate: 0, read_rate: 0, created_at: agora, updated_at: agora, completed_at: null,
  messages_failed: 0,
};
const CAMPANHAS = [
  { ...base, id: '1', name: 'Promo de terça', status: 'running', scheduled_at: null, started_at: agora,
    total_recipients: 100, messages_sent: 40, messages_delivered: 36, messages_read: 20 },
  { ...base, id: '2', name: 'Volta às aulas', status: 'completed', scheduled_at: null, started_at: '2020-01-10T12:00:00Z',
    total_recipients: 50, messages_sent: 50, messages_delivered: 45, messages_read: 30 },
  { ...base, id: '3', name: 'Feijoada de sábado', status: 'scheduled', scheduled_at: '2099-01-01T15:00:00Z', started_at: null,
    total_recipients: 80, messages_sent: 0, messages_delivered: 0, messages_read: 0 },
];

// userEvent + menu da linha: com a máquina carregada, 5 s não bastam.
jest.setTimeout(20000);

const tela = () => render(<MemoryRouter><WhatsAppCampaignsPage /></MemoryRouter>);

beforeEach(() => {
  navegar.mockReset();
  pauseCampaign.mockReset().mockResolvedValue({});
  getCampaigns.mockReset().mockResolvedValue({ results: CAMPANHAS });
});

it('mostra os quatro números que importam', async () => {
  tela();
  const numeros = await screen.findByRole('region', { name: 'Números das campanhas' });

  // Enviadas no mês: só a campanha que começou este mês (40), não a de 2020.
  expect(within(numeros).getByText('Enviadas no mês')).toBeInTheDocument();
  expect(within(numeros).getByText('40')).toBeInTheDocument();
  // Entregues sobre o total enviado: 81 de 90 = 90%.
  expect(within(numeros).getByText('Entregues')).toBeInTheDocument();
  expect(within(numeros).getByText('90%')).toBeInTheDocument();
  // Lidas: 50 de 90 = 56%.
  expect(within(numeros).getByText('Lidas')).toBeInTheDocument();
  expect(within(numeros).getByText('56%')).toBeInTheDocument();
  expect(within(numeros).getByText('Agendadas')).toBeInTheDocument();
  expect(within(numeros).getByText('1')).toBeInTheDocument();
});

it('uma tabela com o estado de cada campanha no selo do kit', async () => {
  tela();
  const secao = await screen.findByRole('region', { name: 'Campanhas' });

  expect(within(secao).getAllByText('Promo de terça').length).toBeGreaterThan(0);
  // "running" do backend é "Enviando", no tom de info — do estados.ts.
  const enviando = within(secao).getAllByText('Enviando')[0];
  expect(enviando.className).toMatch(/--info/);
  expect(within(secao).getAllByText('Enviada')[0].className).toMatch(/--success/);
  expect(within(secao).getAllByText('Agendada')[0].className).toMatch(/--info/);
});

it('entregues e lidas viram barra pequena, com nome acessível', async () => {
  tela();
  await screen.findAllByText('Promo de terça');

  const barras = screen.getAllByRole('progressbar', { name: 'Entregues em Promo de terça' });
  expect(barras[0]).toHaveAttribute('aria-valuenow', '90');
  expect(screen.getAllByRole('progressbar', { name: 'Lidas em Promo de terça' })[0]).toHaveAttribute('aria-valuenow', '50');
});

it('as ações ficam no menu da linha e dizem o que fazem', async () => {
  tela();
  await screen.findAllByText('Promo de terça');

  await userEvent.click(screen.getAllByRole('button', { name: 'Ações de Promo de terça' })[0]);
  await userEvent.click(screen.getByRole('menuitem', { name: 'Pausar envio' }));

  expect(pauseCampaign).toHaveBeenCalledWith('1');
});

it('sem campanha, o vazio diz o que fazer', async () => {
  getCampaigns.mockResolvedValue({ results: [] });
  tela();

  expect(await screen.findByText('Nenhuma campanha ainda')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Números das campanhas' })).toBeNull();
  const criar = screen.getAllByRole('button', { name: /Criar campanha/ });
  await userEvent.click(criar[criar.length - 1]);
  expect(navegar).toHaveBeenCalledWith('/marketing/whatsapp/new');
});

it('falha de carga não vira "nenhuma campanha"', async () => {
  getCampaigns.mockRejectedValue(new Error('rede'));
  tela();

  expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível carregar as campanhas/);
  expect(screen.queryByText('Nenhuma campanha ainda')).toBeNull();
  getCampaigns.mockResolvedValue({ results: CAMPANHAS });
  await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect((await screen.findAllByText('Promo de terça')).length).toBeGreaterThan(0);
});
