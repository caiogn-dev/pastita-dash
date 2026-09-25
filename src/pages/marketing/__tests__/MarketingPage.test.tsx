/**
 * O hub de marketing, simples: números do kit, ações de entrada em AcaoCard
 * (sem gradiente, sem cor por cartão), modelos e campanhas recentes com o
 * estado no selo do kit.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import MarketingPage from '../MarketingPage';

const navegar = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navegar,
}));

let lojaId: string | null = 'loja-1';
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: lojaId, storeName: 'Cê', stores: [] }),
}));

const stats = jest.fn();
const modelos = jest.fn();
const campanhas = jest.fn();
jest.mock('../../../services/marketingService', () => ({
  __esModule: true,
  marketingService: {
    stats: { get: (...a: unknown[]) => stats(...a) },
    emailTemplates: { list: (...a: unknown[]) => modelos(...a) },
    emailCampaigns: { list: (...a: unknown[]) => campanhas(...a) },
  },
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const STATS = {
  email: { total_campaigns: 3, total_sent: 1200, total_delivered: 1100, total_opened: 400, total_clicked: 50, open_rate: 36.4, click_rate: 4.5 },
  whatsapp: { total_campaigns: 2, total_sent: 300, total_delivered: 290, total_read: 210, total_replied: 12, delivery_rate: 96.7, read_rate: 70 },
  subscribers: { total: 540, active: 500, unsubscribed: 40, new_this_month: 25 },
};
const MODELO = {
  id: 't1', store: 'loja-1', name: 'Cupom de volta', slug: 'cupom-volta', subject: 'Um presente para você',
  html_content: '<p>oi</p>', template_type: 'coupon', variables: ['nome'], is_active: true,
  created_at: '', updated_at: '',
};
const CAMPANHA = { id: 'c1', name: 'Cupom de setembro', subject: '10% hoje', status: 'sent', emails_sent: 180, created_at: '' };

// userEvent + menu da linha: com a máquina carregada, 5 s não bastam.
jest.setTimeout(20000);

const tela = () => render(<MemoryRouter><MarketingPage /></MemoryRouter>);

beforeEach(() => {
  lojaId = 'loja-1';
  navegar.mockReset();
  stats.mockReset().mockResolvedValue(STATS);
  modelos.mockReset().mockResolvedValue([MODELO]);
  campanhas.mockReset().mockResolvedValue([CAMPANHA]);
});

it('os números vêm do KpiGrid do kit', async () => {
  tela();
  const numeros = await screen.findByRole('region', { name: 'Números do marketing' });

  expect(within(numeros).getByText('E-mails enviados')).toBeInTheDocument();
  expect(within(numeros).getByText('1.200')).toBeInTheDocument();
  expect(within(numeros).getByText('WhatsApp enviados')).toBeInTheDocument();
  expect(within(numeros).getByText('Contatos')).toBeInTheDocument();
  expect(within(numeros).getByText('540')).toBeInTheDocument();
});

it('as ações de entrada são AcaoCard: botão com título e consequência', async () => {
  tela();
  const acoes = await screen.findByRole('region', { name: 'Começar uma campanha' });

  await userEvent.click(within(acoes).getByRole('button', { name: /Campanha no WhatsApp/ }));
  expect(navegar).toHaveBeenCalledWith('/marketing/whatsapp/new');
  expect(within(acoes).getByRole('button', { name: /Enviar cupom por e-mail/ })).toBeInTheDocument();
});

it('campanhas recentes numa tabela com o estado no selo do kit', async () => {
  tela();
  const secao = await screen.findByRole('region', { name: 'Campanhas recentes' });

  expect(within(secao).getAllByText('Cupom de setembro').length).toBeGreaterThan(0);
  expect(within(secao).getAllByText('Enviada')[0].className).toMatch(/--success/);
});

it('modelo abre a prévia e "Usar modelo" leva à nova campanha', async () => {
  tela();
  const secao = await screen.findByRole('region', { name: 'Modelos de e-mail' });

  await userEvent.click(within(secao).getByRole('button', { name: /Cupom de volta/ }));
  await userEvent.click(await screen.findByRole('button', { name: 'Usar este modelo' }));
  expect(navegar).toHaveBeenCalledWith('/marketing/email/new?template=cupom-volta');
});

it('sem campanha, o vazio diz o que fazer', async () => {
  campanhas.mockResolvedValue([]);
  tela();

  expect(await screen.findByText('Nenhuma campanha ainda')).toBeInTheDocument();
});

it('falha de carga não vira "nenhuma campanha"', async () => {
  stats.mockRejectedValue(new Error('rede'));
  tela();

  expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível carregar o marketing/);
  expect(screen.queryByText('Nenhuma campanha ainda')).toBeNull();
});

it('sem loja escolhida, diz o que fazer em vez de uma tela em branco', async () => {
  lojaId = null;
  tela();

  expect(await screen.findByText('Escolha uma loja')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ver lojas' }));
  expect(navegar).toHaveBeenCalledWith('/stores');
});
