/**
 * Modelos de mensagem do WhatsApp, simples: lista à esquerda, prévia no balão
 * do kit à direita, variáveis em Input do kit. Sem o verde do WhatsApp em hex,
 * sem cor por categoria, sem botão que não faz nada.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import WhatsAppTemplatesPage from '../WhatsAppTemplatesPage';
import { whatsappTemplates } from '../../../../data/whatsappTemplates';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

jest.mock('../../../../hooks/useStore', () => ({
  useStore: () => ({ storeId: 'loja-ce', storeName: 'Cê Saladas' }),
}));

// O que a loja manda DE VERDADE: AutoMessage do servidor. Uma de outra loja do
// mesmo dono vem junto na API e não pode aparecer.
const preparoDaCe = {
  id: 'am-1', company: 'perfil-ce', store_id: 'loja-ce', event_type: 'order_preparing',
  name: 'Pedido em preparo', is_active: true, message_type: 'text',
  message_text: '👨‍🍳 *Seu pedido está sendo preparado!*\n\nOlá {primeiro_nome},\n\nPedido #{order_number} em preparação.\n⏱️ Falta aproximadamente {tempo} minutos!',
  created_at: '', updated_at: '',
};
const preparoDeOutraLoja = {
  ...preparoDaCe, id: 'am-2', company: 'perfil-agriao', store_id: 'loja-agriao',
  message_text: 'Texto da outra loja',
};
const boasVindasDaCe = { ...preparoDaCe, id: 'am-3', event_type: 'welcome', name: 'Boas-vindas', message_text: 'Oi' };

jest.mock('../../../../services/automation', () => ({
  eventTypeLabels: { order_preparing: 'Pedido em Preparo', welcome: 'Boas-vindas' },
  autoMessageService: {
    list: jest.fn(() => Promise.resolve({ results: [preparoDaCe, preparoDeOutraLoja, boasVindasDaCe], count: 3 })),
  },
}));

// userEvent + menu da linha: com a máquina carregada, 5 s não bastam.
jest.setTimeout(20000);

const tela = () => render(<MemoryRouter><WhatsAppTemplatesPage /></MemoryRouter>);

it('os avisos de status mostrados são os que a loja envia, com o botão de editar', async () => {
  tela();
  const avisos = await screen.findByRole('region', { name: 'Avisos automáticos do pedido' });

  expect(within(avisos).getByText('Pedido em Preparo')).toBeInTheDocument();
  expect(within(avisos).queryByText('Boas-vindas')).not.toBeInTheDocument();
  expect(within(avisos).getByRole('link', { name: /Editar/ })).toHaveAttribute(
    'href', '/automation/companies/perfil-ce/messages',
  );

  await userEvent.click(within(avisos).getByRole('button', { name: /Pedido em Preparo/ }));
  const previa = screen.getByRole('figure', { name: 'Prévia da mensagem' });
  expect(previa).toHaveTextContent('Seu pedido está sendo preparado!');
  expect(previa).toHaveTextContent('Falta aproximadamente 40 minutos!');
  expect(previa).not.toHaveTextContent('Texto da outra loja');
});

it('a lista fixa não tem mais cópia dos avisos de status (eram outra coisa)', () => {
  expect(whatsappTemplates.map((t) => t.id)).not.toEqual(
    expect.arrayContaining(['order_preparing']),
  );
  expect(whatsappTemplates.some((t) => /order_(confirmed|preparing|delivery|delivered)/.test(t.id))).toBe(false);
});

it('mostra quantos modelos há e filtra por categoria', async () => {
  tela();
  const lista = screen.getByRole('region', { name: 'Modelos' });
  expect(within(lista).getAllByRole('button')).toHaveLength(whatsappTemplates.length);

  await userEvent.click(screen.getByRole('tab', { name: /Marketing/ }));
  const deMarketing = whatsappTemplates.filter((t) => t.category === 'marketing').length;
  expect(within(lista).getAllByRole('button')).toHaveLength(deMarketing);
});

it('sem modelo escolhido, a prévia diz o que fazer', () => {
  tela();
  expect(screen.getByText('Escolha um modelo')).toBeInTheDocument();
});

it('escolher um modelo mostra a prévia no balão e as variáveis viram campos', async () => {
  tela();
  const modelo = whatsappTemplates[0];
  await userEvent.click(screen.getByRole('button', { name: new RegExp(modelo.name) }));

  const previa = screen.getByRole('figure', { name: 'Prévia da mensagem' });
  const campo = screen.getByLabelText(modelo.variables[0]);
  await userEvent.type(campo, 'Maria');
  expect(previa).toHaveTextContent('Maria');
  expect(screen.getByRole('button', { name: 'Copiar mensagem' })).toBeInTheDocument();
});
