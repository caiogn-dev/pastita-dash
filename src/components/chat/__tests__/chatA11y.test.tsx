import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomerPanel } from '../CustomerPanel';
import { MessageInput } from '../MessageInput';

// Regressão de acessibilidade: botões icon-only do fluxo de WhatsApp precisam
// expor um nome acessível (aria-label) para leitores de tela.

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../services/crmApi', () => ({
  __esModule: true,
  crmApi: { getCustomerProfile: jest.fn() },
}));

describe('Acessibilidade — botões icon-only do chat WhatsApp', () => {
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

  it('MessageInput: botão de remover arquivo selecionado tem nome acessível', () => {
    const file = new File(['conteudo'], 'documento.pdf', {
      type: 'application/pdf',
    });

    render(
      <MessageInput
        onSend={jest.fn()}
        selectedFile={file}
        onClearFile={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /remover arquivo selecionado/i })
    ).toBeInTheDocument();
  });
});
