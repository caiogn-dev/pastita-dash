/**
 * Avisos automáticos (26/10): "Mensagens prontas" (o texto) e "Avisos
 * enviados" (o registro) eram duas telas para a mesma coisa. Agora é uma, com
 * duas abas — e o aviso que não chegou leva direto ao texto dele.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));

jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'ce-saladas', storeName: 'Cê Saladas', store: null }),
}));

const listarPerfis = jest.fn();
const listarMensagens = jest.fn();
jest.mock('../../../services/automation', () => ({
  ...jest.requireActual('../../../services/automation'),
  companyProfileService: { list: (...a: unknown[]) => listarPerfis(...a) },
  autoMessageService: {
    list: (...a: unknown[]) => listarMensagens(...a),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    test: jest.fn(),
  },
}));

const getMensagensAutomaticas = jest.fn();
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: { getMensagensAutomaticas: (...a: unknown[]) => getMensagensAutomaticas(...a) },
}));

import { AvisosAutomaticosPage } from '../AvisosAutomaticosPage';

const msg = (over: Record<string, unknown>) => ({
  id: 'm1', name: 'Fora do horário', event_type: 'out_of_hours', message_text: 'Estamos fechados',
  message_type: 'text', is_active: true, delay_seconds: 0, priority: 100, buttons: [],
  created_at: '', updated_at: '', ...over,
});

const Onde: React.FC = () => {
  const l = useLocation();
  return <span data-testid="onde">{l.pathname + l.search}</span>;
};

const renderizar = (url = '/atendimento/avisos-automaticos') => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/atendimento/avisos-automaticos" element={<AvisosAutomaticosPage />} />
      <Route path="*" element={<Onde />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  jest.clearAllMocks();
  listarPerfis.mockResolvedValue({ results: [{ id: 'perfil-1', company_name: 'Cê', account: 'conta-1' }] });
  listarMensagens.mockResolvedValue({
    results: [
      msg({}),
      msg({ id: 'm2', name: 'Lembrete', event_type: 'pix_reminder', message_text: 'Seu PIX vence', delay_seconds: 1800 }),
      msg({ id: 'm3', name: 'FAQ', event_type: 'faq', message_text: 'Pergunta frequente' }),
      msg({ id: 'm4', name: 'Carrinho', event_type: 'cart_reminder', message_text: 'Esqueceu o carrinho' }),
    ],
  });
});

it('título "Avisos automáticos" com as abas Textos e Enviados', async () => {
  renderizar();
  expect(screen.getByRole('heading', { name: 'Avisos automáticos' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Textos' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Enviados' })).toBeInTheDocument();
  await screen.findByText('Estamos fechados');
});

it('carregando já mora dentro da página, com título', () => {
  listarPerfis.mockReturnValue(new Promise(() => undefined));
  renderizar();
  expect(screen.getByRole('heading', { name: 'Avisos automáticos' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();
});

it('Textos: três grupos, só o evento com texto aparece, sem faq nem carrinho', async () => {
  renderizar();
  await screen.findByText('Estamos fechados');

  const conversa = screen.getByRole('region', { name: 'Conversa' });
  expect(within(conversa).getByText('Fora do horário', { selector: 'h3' })).toBeInTheDocument();
  expect(within(conversa).queryByText('Boas-vindas')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Pedido' })).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Pagamento' })).getByText('Espera 30 min')).toBeInTheDocument();

  expect(screen.queryByText('Pergunta frequente')).not.toBeInTheDocument();
  expect(screen.queryByText('Esqueceu o carrinho')).not.toBeInTheDocument();
});

it('"Adicionar aviso" do grupo oferece só os momentos daquele grupo, sem ID do botão', async () => {
  renderizar();
  await screen.findByText('Estamos fechados');

  fireEvent.click(within(screen.getByRole('region', { name: 'Pedido' })).getByRole('button', { name: /adicionar aviso/i }));
  const dialogo = screen.getByRole('dialog');
  const momentos = within(dialogo).getByLabelText('Quando enviar') as HTMLSelectElement;
  const rotulos = Array.from(momentos.options).map((o) => o.textContent);
  expect(rotulos).toContain('Pedido em preparo');
  expect(rotulos).not.toContain('Boas-vindas');
  expect(rotulos).not.toContain('Lembrete de carrinho');

  fireEvent.click(within(dialogo).getByRole('button', { name: /adicionar botão/i }));
  expect(within(dialogo).queryByLabelText(/ID do botão/i)).not.toBeInTheDocument();
  expect(within(dialogo).queryByLabelText(/nome interno/i)).not.toBeInTheDocument();
});

it('sem atendimento automático configurado, a tela oferece conectar o WhatsApp', async () => {
  listarPerfis.mockResolvedValue({ results: [] });
  renderizar();

  fireEvent.click(await screen.findByRole('button', { name: /conectar whatsapp/i }));
  expect(screen.getByTestId('onde')).toHaveTextContent('/connections');
});

it('Enviados: "Editar texto" de um aviso que não chegou abre a aba Textos naquele momento', async () => {
  getMensagensAutomaticas.mockResolvedValue({
    dias: 7,
    resumo: [{ tipo: 'payment_failed', rotulo: 'Pagamento', total: 1, falharam: 1 }],
    itens: [{
      id: 'a1', quando: '2026-10-26T14:00:00Z', tipo: 'payment_failed', rotulo: 'Pagamento recusado',
      cliente: 'Marta', telefone: '', texto: 'Seu pagamento não passou', status: 'failed',
      erro: 'Não chegou', erro_tecnico: '', conversa_id: null,
    }],
  });
  renderizar('/atendimento/avisos-automaticos?aba=enviados');

  fireEvent.click(await screen.findByRole('button', { name: /editar texto/i }));

  expect(screen.getByRole('tab', { name: 'Textos' })).toHaveAttribute('aria-selected', 'true');
  // O momento sem texto aparece mesmo vazio, já com o botão de escrever o aviso.
  const pagamento = await screen.findByRole('region', { name: 'Pagamento' });
  expect(within(pagamento).getByText('Pagamento recusado', { selector: 'h3' })).toBeInTheDocument();
});
