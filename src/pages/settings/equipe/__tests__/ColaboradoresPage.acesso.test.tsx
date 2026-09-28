/**
 * O convite tem que dar ACESSO: celular + senha definida pelo dono.
 * Antes o convite criava a pessoa sem senha e o login só aceitava e-mail.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
const toast = jest.requireMock('react-hot-toast').default as { success: jest.Mock };

const addTeamMember = jest.fn();
jest.mock('../../../../services/crmApi', () => ({
  crmApi: {
    getTeam: jest.fn().mockResolvedValue({ data: [] }),
    addTeamMember: (...a: unknown[]) => addTeamMember(...a),
    updateTeamMember: jest.fn(),
    removeTeamMember: jest.fn(),
  },
}));
jest.mock('../../../../services', () => ({
  getErrorMessage: (e: unknown) => String(e),
}));
jest.mock('../../../../hooks/useStore', () => ({
  useStore: () => ({ storeId: 's1', storeSlug: 'loja-x', store: { id: 's1', slug: 'loja-x' } }),
}));

import { ColaboradoresPage } from '../ColaboradoresPage';

describe('ColaboradoresPage — acesso do colaborador', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addTeamMember.mockResolvedValue({ status: 201, data: {} });
  });

  it('manda a senha junto com o convite e diz como a pessoa entra', async () => {
    render(<MemoryRouter><ColaboradoresPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText(/celular do colaborador/i), { target: { value: '63 98888-0002' } });
    fireEvent.change(screen.getByLabelText(/^nome/i), { target: { value: 'João' } });
    fireEvent.change(screen.getByLabelText(/senha de acesso/i), { target: { value: 'segredo1' } });
    fireEvent.click(screen.getByRole('button', { name: /convidar/i }));

    await waitFor(() => expect(addTeamMember).toHaveBeenCalledWith('loja-x', {
      phone: '63 98888-0002', name: 'João', role: 'operator', password: 'segredo1',
    }));
    expect(toast.success.mock.calls[0][0]).toMatch(/celular e a senha/i);
  });

  it('sem senha de 6 caracteres o botão fica desligado', async () => {
    render(<MemoryRouter><ColaboradoresPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText(/celular do colaborador/i), { target: { value: '63 98888-0002' } });
    fireEvent.change(screen.getByLabelText(/senha de acesso/i), { target: { value: '123' } });
    expect(screen.getByRole('button', { name: /convidar/i })).toBeDisabled();
  });
});
