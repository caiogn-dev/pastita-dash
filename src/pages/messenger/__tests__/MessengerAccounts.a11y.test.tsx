import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MessengerAccounts from '../MessengerAccounts';
import { messengerService, MessengerAccount } from '../../../services/messenger';

jest.mock('../../../services/messenger', () => ({
  __esModule: true,
  messengerService: {
    getAccounts: jest.fn(),
    createAccount: jest.fn(),
    updateAccount: jest.fn(),
    deleteAccount: jest.fn(),
    verifyWebhook: jest.fn(),
  },
}));

// O barrel de hooks arrasta useWebSocket → useStore → storeConfig (import.meta),
// que quebra no jest. Mockamos apenas o useConfirm consumido pela página.
jest.mock('../../../hooks', () => ({
  useConfirm: () => [null, jest.fn().mockResolvedValue(true)],
}));

const mockAccount = {
  id: 'acc-1',
  name: 'Loja Oficial',
  page_id: '123456',
  page_name: 'Loja Oficial FB',
  status: 'active',
  is_active: true,
  webhook_verified: true,
  auto_response_enabled: false,
  human_handoff_enabled: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as MessengerAccount;

describe('MessengerAccounts — acessibilidade dos controles icon-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (messengerService.getAccounts as jest.Mock).mockResolvedValue({ data: [mockAccount] });
  });

  it('expõe nome acessível nos botões de editar e excluir conta', async () => {
    render(<MessengerAccounts />);

    const editar = await screen.findByRole('button', { name: /editar conta loja oficial fb/i });
    const excluir = await screen.findByRole('button', { name: /excluir conta loja oficial fb/i });

    expect(editar).toBeInTheDocument();
    expect(excluir).toBeInTheDocument();
  });

  it('expõe nome acessível no campo de busca', async () => {
    render(<MessengerAccounts />);
    await waitFor(() => expect(screen.getByText('Loja Oficial FB')).toBeInTheDocument());

    expect(screen.getByRole('textbox', { name: /buscar contas/i })).toBeInTheDocument();
  });

  it('expõe nome acessível no botão de fechar o modal', async () => {
    render(<MessengerAccounts />);

    const adicionar = await screen.findByRole('button', { name: /adicionar conta/i });
    adicionar.click();

    expect(await screen.findByRole('button', { name: /fechar/i })).toBeInTheDocument();
  });

  it('associa cada label do formulário ao seu campo (htmlFor/id)', async () => {
    render(<MessengerAccounts />);

    const adicionar = await screen.findByRole('button', { name: /adicionar conta/i });
    adicionar.click();

    // getByLabelText só resolve se label estiver associado ao input.
    expect(await screen.findByLabelText('Nome da Conta')).toBeInTheDocument();
    expect(screen.getByLabelText('Page ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome da Página')).toBeInTheDocument();
    expect(screen.getByLabelText('Page Access Token')).toBeInTheDocument();
  });
});
