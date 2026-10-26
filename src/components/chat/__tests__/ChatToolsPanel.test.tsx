/**
 * Painel do chat (26/10): "Templates" vira "Modelos" e mostra só os modelos
 * da Meta, em português; sai o "Criar Pedido" das Ferramentas (o botão do
 * cabeçalho já abre o Novo Pedido de verdade, preenchido).
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const getTemplates = jest.fn();
jest.mock('../../../services', () => ({
  __esModule: true,
  getErrorMessage: () => 'erro',
  ordersService: {},
  productsService: {},
  whatsappService: { getTemplates: (...a: unknown[]) => getTemplates(...a), sendTemplate: jest.fn() },
}));

import { ChatToolsPanel } from '../ChatToolsPanel';

const abrir = (defaultTab?: 'templates' | 'tools') => render(
  <ChatToolsPanel
    accountId="acc-1"
    conversation={{ phone_number: '5563999990000', account: 'acc-1', contact_name: 'Maria' }}
    onInsertText={jest.fn()}
    onSendMessage={jest.fn()}
    onClose={jest.fn()}
    defaultTab={defaultTab}
  />,
);

beforeEach(() => {
  getTemplates.mockResolvedValue({ data: { results: [
    { id: 't1', name: 'oferta_do_dia', status: 'APPROVED', language: 'pt_BR', category: 'MARKETING', components: [{ type: 'BODY', text: 'Oi {{1}}' }] },
  ] } });
});

it('aba "Modelos" com os modelos da Meta em português, sem os textos fixos', async () => {
  abrir();
  expect(screen.getByRole('button', { name: 'Modelos' })).toBeInTheDocument();
  expect(await screen.findByText('oferta_do_dia')).toBeInTheDocument();
  expect(screen.getByText('Aprovado · Português · Promoção')).toBeInTheDocument();
  expect(screen.queryByText(/APPROVED|pt_BR|MARKETING/)).not.toBeInTheDocument();
  expect(screen.queryByText('Cupom de Desconto')).not.toBeInTheDocument();
  expect(screen.queryByText(/template/i)).not.toBeInTheDocument();
});

it('Ferramentas sem "Criar Pedido"', () => {
  abrir('tools');
  fireEvent.click(screen.getByRole('button', { name: /ferramentas/i }));
  expect(screen.getByText('Catálogo')).toBeInTheDocument();
  expect(screen.queryByText(/criar pedido/i)).not.toBeInTheDocument();
});
