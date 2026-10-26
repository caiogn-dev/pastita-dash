/**
 * Modelos de mensagem = os modelos da Meta da conta da loja (26/10).
 *
 * Até aqui a tela listava cinco textos fixos do código, que a Meta nunca viu e
 * que não furam a janela de 24 h, e uma cópia somente-leitura dos avisos do
 * pedido (que já têm tela própria). O que importa aqui é o que a Meta aprovou.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../../services/api', () => ({ __esModule: true, default: {} }));

jest.mock('../../../../hooks/useStore', () => ({
  useStore: () => ({ storeId: 'loja-ce', storeSlug: 'ce-saladas', storeName: 'Cê Saladas' }),
}));

const listarPerfis = jest.fn();
jest.mock('../../../../services/automation', () => ({
  companyProfileService: { list: (...a: unknown[]) => listarPerfis(...a) },
}));

const getTemplates = jest.fn();
const syncTemplates = jest.fn();
jest.mock('../../../../services/whatsapp', () => ({
  __esModule: true,
  default: {
    getTemplates: (...a: unknown[]) => getTemplates(...a),
    syncTemplates: (...a: unknown[]) => syncTemplates(...a),
  },
}));

import WhatsAppTemplatesPage from '../WhatsAppTemplatesPage';

const MODELOS = [
  { id: 't1', name: 'oferta_do_dia', language: 'pt_BR', category: 'MARKETING', status: 'approved', account: 'conta-1', components: [{ type: 'BODY', text: 'Oi {{1}}, hoje tem oferta' }] },
  { id: 't2', name: 'pedido_pronto', language: 'pt_BR', category: 'utility', status: 'pending', account: 'conta-1', components: [] },
  { id: 't3', name: 'promo_errada', language: 'en_US', category: 'marketing', status: 'rejected', account: 'conta-1', components: [] },
];

const Onde: React.FC = () => {
  const l = useLocation();
  return <span data-testid="onde">{l.pathname + l.search}</span>;
};

const tela = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/marketing/whatsapp/templates']}>
      <Routes>
        <Route path="/marketing/whatsapp/templates" element={<WhatsAppTemplatesPage />} />
        <Route path="*" element={<Onde />} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  jest.clearAllMocks();
  listarPerfis.mockResolvedValue({ results: [{ id: 'perfil-1', account: 'conta-1' }] });
  getTemplates.mockResolvedValue({ data: { results: MODELOS } });
  syncTemplates.mockResolvedValue({ data: { count: 3 } });
});

it('lista os modelos da Meta da conta da loja, com situação, idioma e categoria em português', async () => {
  tela();

  const linha = (await screen.findByText('oferta_do_dia')).closest('li')!;
  expect(getTemplates).toHaveBeenCalledWith('conta-1');
  expect(within(linha).getByText('Aprovado')).toBeInTheDocument();
  expect(within(linha).getByText(/Português · Promoção/)).toBeInTheDocument();
  expect(within(linha).getByText('Oi {{1}}, hoje tem oferta')).toBeInTheDocument();

  expect(within(screen.getByText('pedido_pronto').closest('li')!).getByText('Em análise')).toBeInTheDocument();
  expect(within(screen.getByText('promo_errada').closest('li')!).getByText('Recusado')).toBeInTheDocument();
  expect(screen.queryByText(/APPROVED|pt_BR|MARKETING/)).not.toBeInTheDocument();
});

it('sem a cópia dos avisos do pedido nem os textos fixos', async () => {
  tela();
  await screen.findByText('oferta_do_dia');
  expect(screen.queryByRole('region', { name: 'Avisos automáticos do pedido' })).not.toBeInTheDocument();
  expect(screen.queryByText('Cupom de Desconto')).not.toBeInTheDocument();
});

it('"Usar em campanha" só no aprovado, e abre a campanha com o modelo escolhido', async () => {
  tela();
  const aprovado = (await screen.findByText('oferta_do_dia')).closest('li')!;
  expect(within(screen.getByText('pedido_pronto').closest('li')!).queryByRole('button', { name: /usar em campanha/i })).not.toBeInTheDocument();

  fireEvent.click(within(aprovado).getByRole('button', { name: /usar em campanha/i }));
  expect(screen.getByTestId('onde')).toHaveTextContent('/marketing/whatsapp/new?modelo=t1');
});

it('"Sincronizar" busca na Meta e recarrega a lista', async () => {
  tela();
  await screen.findByText('oferta_do_dia');

  fireEvent.click(screen.getByRole('button', { name: /sincronizar/i }));
  await waitFor(() => expect(syncTemplates).toHaveBeenCalledWith('conta-1'));
  await waitFor(() => expect(getTemplates).toHaveBeenCalledTimes(2));
});

it('falha ao carregar não vira "nenhum modelo"', async () => {
  getTemplates.mockRejectedValue(new Error('rede'));
  tela();
  expect(await screen.findByText(/não foi possível carregar os modelos/i)).toBeInTheDocument();
  expect(screen.queryByText(/nenhum modelo/i)).not.toBeInTheDocument();
});

it('conta sem modelo oferece sincronizar', async () => {
  getTemplates.mockResolvedValue({ data: { results: [] } });
  tela();
  expect(await screen.findByText(/nenhum modelo/i)).toBeInTheDocument();
});

it('sem WhatsApp conectado, oferece conectar', async () => {
  listarPerfis.mockResolvedValue({ results: [] });
  tela();
  fireEvent.click(await screen.findByRole('button', { name: /conectar whatsapp/i }));
  expect(screen.getByTestId('onde')).toHaveTextContent('/connections');
});
