/**
 * Remover colaborador pede confirmação (auditoria 20/10): a lixeira tirava o
 * acesso no primeiro clique — um toque errado no meio do turno.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const removeTeamMember = jest.fn().mockResolvedValue({});
jest.mock('../../../../services/crmApi', () => ({
  crmApi: {
    getTeam: jest.fn().mockResolvedValue({
      data: [{ id: 'm1', role: 'operator', user: { id: 'u1', first_name: 'Ana', last_name: 'Lima', email: '', phone: '' } }],
    }),
    addTeamMember: jest.fn(),
    updateTeamMember: jest.fn(),
    removeTeamMember: (...a: unknown[]) => removeTeamMember(...a),
  },
}));
jest.mock('../../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('../../../../hooks/useStore', () => ({
  useStore: () => ({ storeId: 's1', storeSlug: 'loja-x', store: { id: 's1', slug: 'loja-x' } }),
}));

import { ColaboradoresPage } from '../ColaboradoresPage';

it('a lixeira pergunta antes; cancelar não remove, confirmar remove', async () => {
  render(<MemoryRouter><ColaboradoresPage /></MemoryRouter>);
  const lixeira = await screen.findByRole('button', { name: /remover ana/i });

  fireEvent.click(lixeira);
  let dialogo = await screen.findByRole('dialog');
  fireEvent.click(within(dialogo).getByRole('button', { name: /cancelar/i }));
  expect(removeTeamMember).not.toHaveBeenCalled();

  fireEvent.click(lixeira);
  dialogo = await screen.findByRole('dialog');
  fireEvent.click(within(dialogo).getByRole('button', { name: /^remover$/i }));
  await waitFor(() => expect(removeTeamMember).toHaveBeenCalledWith('loja-x', 'm1'));
});
