/**
 * O recuperador de vendas: quanto ficou no carrinho e quanto voltou.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import RecuperacaoPage from '../RecuperacaoPage';

const painel = jest.fn();
jest.mock('../../../../services/api', () => ({ __esModule: true, default: {} }));
const listarMensagens = jest.fn();
jest.mock('../../../../services/automation', () => ({
  ...jest.requireActual('../../../../services/automation'),
  companyProfileService: { list: jest.fn().mockResolvedValue({ results: [{ id: 'perfil-1' }] }) },
  autoMessageService: { list: (...a: unknown[]) => listarMensagens(...a), update: jest.fn(), create: jest.fn(), delete: jest.fn(), test: jest.fn() },
}));
jest.mock('../../../../services/storesApi', () => ({ __esModule: true, updateStore: jest.fn() }));
jest.mock('../../../../services/recuperacao', () => ({
  __esModule: true,
  recuperacaoService: { painel: (...a: unknown[]) => painel(...a) },
}));
jest.mock('../../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ store: { slug: 'ce-saladas', name: 'Cê' }, storeSlug: 'ce-saladas', isStoreSelected: true }),
}));

const DADOS = {
  dias: 30, abandonados: 12, valor_abandonado: 1000, ticket_medio: 83.33,
  mensagens_enviadas: 9, recuperados: 3, valor_recuperado: 240,
  taxa_de_recuperacao: 25, oportunidade_perdida: 760, sem_telefone: 40,
};

const tela = () => render(<MemoryRouter><RecuperacaoPage /></MemoryRouter>);

beforeEach(() => {
  painel.mockReset().mockResolvedValue(DADOS);
  listarMensagens.mockReset().mockResolvedValue({
    results: [
      { id: 'c1', name: 'Lembrete 2 h', event_type: 'cart_reminder_2h', message_text: 'Seu carrinho te espera', is_active: true, message_type: 'text', created_at: '', updated_at: '' },
      { id: 'w1', name: 'Boas-vindas', event_type: 'welcome', message_text: 'Olá!', is_active: true, message_type: 'text', created_at: '', updated_at: '' },
    ],
  });
});

it('mostra o dinheiro que está na mesa', async () => {
  tela();

  expect(await screen.findByText(/R\$\s*760/)).toBeInTheDocument();
  expect(screen.getByText('Oportunidade perdida')).toBeInTheDocument();
});

it('mostra quantos voltaram e a taxa', async () => {
  tela();

  expect(await screen.findByText('Voltaram e compraram')).toBeInTheDocument();
  expect(screen.getByText(/25% dos abandonados/)).toBeInTheDocument();
});

it('sem carrinho abandonado, explica em vez de mostrar zeros soltos', async () => {
  painel.mockResolvedValue({ ...DADOS, abandonados: 0, recuperados: 0, valor_abandonado: 0,
    valor_recuperado: 0, oportunidade_perdida: 0, taxa_de_recuperacao: 0, mensagens_enviadas: 0 });

  tela();

  expect(await screen.findByText(/Nenhum carrinho abandonado/)).toBeInTheDocument();
});

it('diz quantos carrinhos não tinham telefone — explica a taxa baixa', async () => {
  tela();

  expect(await screen.findByText(/não há para onde mandar o/)).toBeInTheDocument();
  expect(screen.getByText('40')).toBeInTheDocument();
});

it('falha de carga não vira "nada aconteceu"', async () => {
  painel.mockRejectedValue(new Error('rede'));

  tela();

  expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível/i);
});

it('compara com a mesma janela logo antes (do Prefiro)', async () => {
  painel.mockResolvedValue({ ...DADOS, anterior: { abandonados: 10, valor_abandonado: 900, recuperados: 2, valor_recuperado: 120, taxa_de_recuperacao: 20 } });

  tela();

  expect((await screen.findAllByText(/vs 30 dias antes/)).length).toBe(3);
  expect(screen.getByText(/100/)).toBeInTheDocument(); // R$ 120 → R$ 240
});

// 26/10: o texto e o liga/desliga dos lembretes de carrinho moravam em
// "Mensagens prontas", longe do número que eles tentam mover.
it('os lembretes de carrinho (texto e liga/desliga) moram aqui', async () => {
  tela();

  const secao = await screen.findByRole('region', { name: 'Lembretes de carrinho' });
  expect(await within(secao).findByText('Seu carrinho te espera')).toBeInTheDocument();
  expect(within(secao).getByRole('switch', { name: /Lembrete 2 h/ })).toBeInTheDocument();
  expect(within(secao).queryByText('Olá!')).not.toBeInTheDocument();
});

it('"rever o texto do lembrete" leva à seção do lembrete', async () => {
  painel.mockResolvedValue({ ...DADOS, recuperados: 0, valor_recuperado: 0 });
  tela();

  expect(await screen.findByRole('link', { name: /rever o texto do lembrete/i }))
    .toHaveAttribute('href', '#lembretes-de-carrinho');
});
