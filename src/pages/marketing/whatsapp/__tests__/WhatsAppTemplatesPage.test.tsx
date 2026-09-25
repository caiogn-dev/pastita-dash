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

// userEvent + menu da linha: com a máquina carregada, 5 s não bastam.
jest.setTimeout(20000);

const tela = () => render(<MemoryRouter><WhatsAppTemplatesPage /></MemoryRouter>);

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
