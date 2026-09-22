/**
 * Conexões — a tela do LOJISTA para ligar WhatsApp e Instagram.
 *
 * Até 19/09 era uma tela de administrador: Phone Number ID, token, WABA,
 * Messenger, QR, webhook. O lojista não entendia nada e o Instagram nem
 * aparecia. Agora: login oficial (Facebook / Instagram), status em português
 * de gente, e o que é técnico só para quem administra a plataforma.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConnectionsPage from '../ConnectionsPage';

const getAccounts = jest.fn();
const deactivateAccount = jest.fn();
const activateAccount = jest.fn();
jest.mock('../../../services/whatsapp', () => ({
  __esModule: true,
  getAccounts: (...a: unknown[]) => getAccounts(...a),
  deactivateAccount: (...a: unknown[]) => deactivateAccount(...a),
  activateAccount: (...a: unknown[]) => activateAccount(...a),
  syncTemplates: jest.fn(),
}));

const listAccounts = jest.fn();
const getInstagramConnectUrl = jest.fn();
jest.mock('../../../features/channels', () => ({
  __esModule: true,
  channelsApi: {
    listAccounts: (...a: unknown[]) => listAccounts(...a),
    getInstagramConnectUrl: (...a: unknown[]) => getInstagramConnectUrl(...a),
  },
}));

jest.mock('../../../services/instagram', () => ({
  __esModule: true,
  instagramAccountService: { update: jest.fn() },
}));

jest.mock('../../../components/whatsapp/ConnectWhatsAppButton', () => ({
  __esModule: true,
  ConnectWhatsAppButton: ({ rotulo }: { rotulo?: string }) => <button type="button">{rotulo || 'Conectar o WhatsApp'}</button>,
}));

const confirmar = jest.fn(async () => true);
jest.mock('../../../hooks', () => ({
  __esModule: true,
  useConfirm: () => [null, confirmar],
}));

let usuario: { is_superuser?: boolean; is_staff?: boolean } = {};
jest.mock('../../../stores/authStore', () => ({
  __esModule: true,
  useAuthStore: (sel: (s: { user: unknown }) => unknown) => sel({ user: usuario }),
}));

const conta = (over: Record<string, unknown> = {}) => ({
  id: 'wa1', name: 'Cê Saladas', display_phone_number: '+55 63 9138-6719', phone_number: '5563991386719',
  phone_number_id: '1128179527052699', waba_id: '99', status: 'active', is_active: true, metadata: {},
  ...over,
});

const renderizar = () => render(<MemoryRouter><ConnectionsPage /></MemoryRouter>);

beforeEach(() => {
  usuario = {};
  getAccounts.mockReset().mockResolvedValue({ data: { results: [conta()] } });
  listAccounts.mockReset().mockResolvedValue([]);
  getInstagramConnectUrl.mockReset();
  deactivateAccount.mockReset().mockResolvedValue({});
  confirmar.mockClear();
});

it('WhatsApp ligado aparece como "Funcionando", com o número da loja', async () => {
  renderizar();

  const cartao = (await screen.findByRole('heading', { name: 'WhatsApp' })).closest('section')!;
  expect(within(cartao).getByText('Funcionando')).toBeInTheDocument();
  expect(within(cartao).getByText(/\+55 63 9138-6719/)).toBeInTheDocument();
});

it('não mostra termos técnicos ao lojista', async () => {
  renderizar();
  await screen.findByText('Funcionando');

  const texto = document.body.textContent || '';
  for (const termo of ['Phone Number ID', 'WABA', 'Token', 'token', 'Webhook', '1128179527052699', 'Messenger']) {
    expect(texto).not.toContain(termo);
  }
});

it('ponte do celular caída vira aviso com o que fazer', async () => {
  getAccounts.mockResolvedValue({ data: { results: [conta({ metadata: { coex: { connected: false } } })] } });

  renderizar();

  expect(await screen.findByText('Desconectado no celular')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /conectar de novo/i })).toBeInTheDocument();
});

it('sem WhatsApp, o cartão vende e oferece conectar', async () => {
  getAccounts.mockResolvedValue({ data: { results: [] } });

  renderizar();

  expect(await screen.findByRole('button', { name: 'Conectar o WhatsApp' })).toBeInTheDocument();
});

it('Instagram não conectado oferece "Entrar com o Instagram"', async () => {
  renderizar();

  expect(await screen.findByRole('button', { name: /entrar com o instagram/i })).toBeInTheDocument();
});

it('Instagram ainda indisponível na plataforma avisa em vez de quebrar', async () => {
  const popup = { closed: false, close: jest.fn(), location: { href: '' } };
  jest.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  getInstagramConnectUrl.mockRejectedValue({ response: { status: 503, data: { codigo: 'instagram_indisponivel' } } });

  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /entrar com o instagram/i }));

  expect(await screen.findByText(/em breve/i)).toBeInTheDocument();
  expect(popup.close).toHaveBeenCalled();
});

it('Instagram conectado mostra o @ da loja', async () => {
  listAccounts.mockResolvedValue([{ id: 'ig1', name: 'Cê Saladas', handle: 'cesaladas', isActive: true }]);

  renderizar();

  const cartao = (await screen.findByRole('heading', { name: 'Instagram' })).closest('section')!;
  expect(within(cartao).getByText('@cesaladas')).toBeInTheDocument();
  expect(within(cartao).getByText('Funcionando')).toBeInTheDocument();
});

it('desconectar pede confirmação e só pausa (as conversas ficam)', async () => {
  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: 'Desconectar' }));

  await waitFor(() => expect(deactivateAccount).toHaveBeenCalledWith('wa1'));
  expect(confirmar).toHaveBeenCalled();
});

it('administração da plataforma só aparece para quem administra', async () => {
  renderizar();
  await screen.findByText('Funcionando');
  expect(screen.queryByText(/administração da plataforma/i)).not.toBeInTheDocument();
});

it('administrador vê os atalhos técnicos numa seção à parte', async () => {
  usuario = { is_superuser: true };

  renderizar();

  expect(await screen.findByText(/administração da plataforma/i)).toBeInTheDocument();
});
