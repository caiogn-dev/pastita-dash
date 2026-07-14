/**
 * ConnectWhatsAppButton — guarda de sessão do Embedded Signup (COEX).
 *
 * Regressão do incidente 14/jul: o botão abria o fluxo do Meta com a sessão
 * do painel já morta; o QR funcionava, mas o POST /embedded_signup/ levava
 * 401 e o `code` (uso único) era queimado — conta nunca era criada.
 *
 * Contrato: antes de abrir o FB.login, validar a sessão via /auth/me/.
 * Sessão inválida → toast de erro e NÃO abrir o fluxo do Meta.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import ConnectWhatsAppButton from '../ConnectWhatsAppButton';
import { authService } from '../../../services/auth';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('../../../services/auth', () => ({
  authService: { getCurrentUser: jest.fn() },
}));

jest.mock('../../../services/whatsapp', () => ({
  embeddedSignup: jest.fn(),
}));

describe('ConnectWhatsAppButton — pré-checagem de sessão', () => {
  const fbLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).FB = { login: fbLogin, init: jest.fn() };
  });

  afterEach(() => {
    delete (window as any).FB;
  });

  it('não abre o fluxo do Meta quando a sessão está morta (401)', async () => {
    (authService.getCurrentUser as jest.Mock).mockRejectedValue({
      response: { status: 401 },
    });

    render(<ConnectWhatsAppButton />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(fbLogin).not.toHaveBeenCalled();
  });

  it('abre o fluxo do Meta quando a sessão está válida', async () => {
    (authService.getCurrentUser as jest.Mock).mockResolvedValue({ id: 1 });

    render(<ConnectWhatsAppButton />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(fbLogin).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });
});
