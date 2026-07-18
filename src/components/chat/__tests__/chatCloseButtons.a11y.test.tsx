import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomerPanel } from '../CustomerPanel';
import { TemplateSelector } from '../TemplateSelector';
import { NewConversationModal } from '../NewConversationModal';

// Regressão de acessibilidade (reaplicação do PR #123): botões de fechar
// icon-only do fluxo de WhatsApp precisam expor nome acessível.

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../services/crmApi', () => ({
  __esModule: true,
  crmApi: { getCustomerProfile: jest.fn(() => new Promise(() => {})) },
}));

jest.mock('../../../services', () => ({
  __esModule: true,
  whatsappService: {
    getTemplates: jest.fn(() => new Promise(() => {})),
  },
  conversationsService: {},
  getErrorMessage: jest.fn(() => 'erro'),
}));

describe('Acessibilidade — botões de fechar icon-only do chat WhatsApp', () => {
  it('CustomerPanel: botão de fechar tem nome acessível', () => {
    render(
      <CustomerPanel
        storeSlug="loja-teste"
        unifiedUserId={null}
        onNewOrder={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /fechar painel do cliente/i })
    ).toBeInTheDocument();
  });

  it('TemplateSelector: botão de fechar tem nome acessível', () => {
    render(
      <TemplateSelector
        accountId="acc-1"
        toPhone="5563999999999"
        onClose={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /fechar templates/i })
    ).toBeInTheDocument();
  });

  it('NewConversationModal: botão de fechar tem nome acessível', () => {
    render(
      <NewConversationModal
        accountId="acc-1"
        onClose={jest.fn()}
        onConversationCreated={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /^fechar$/i })).toBeInTheDocument();
  });
});
