/**
 * "Push" ligado na preferência não quer dizer que chega alguma coisa: sem a
 * autorização do navegador NESTE aparelho, o alerta não sai. A tela precisa
 * dizer isso e oferecer o botão, senão o dono liga o botão e espera em vão.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsPage } from '../SettingsPage';

const getPreferences = jest.fn();
const updatePreferences = jest.fn();
const subscribe = jest.fn();
let estadoDoPush = { permission: 'default', isSubscribed: false, isLoading: false, error: null as string | null };

jest.mock('../../../services', () => ({
  __esModule: true,
  authService: { changePassword: jest.fn() },
  getErrorMessage: (e: unknown) => String(e),
  notificationsService: {
    getPreferences: (...a: unknown[]) => getPreferences(...a),
    updatePreferences: (...a: unknown[]) => updatePreferences(...a),
  },
}));
jest.mock('../../../hooks/usePushNotifications', () => ({
  __esModule: true,
  usePushNotifications: () => ({ ...estadoDoPush, subscribe, unsubscribe: jest.fn() }),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const PREFS = {
  email_enabled: true, email_messages: true, email_orders: true, email_payments: true, email_system: true,
  push_enabled: true, push_messages: true, push_orders: true, push_payments: true, push_system: true,
  inapp_enabled: true, inapp_sound: true,
};

beforeEach(() => {
  estadoDoPush = { permission: 'default', isSubscribed: false, isLoading: false, error: null };
  getPreferences.mockReset().mockResolvedValue({ data: PREFS });
  updatePreferences.mockReset().mockResolvedValue({ data: PREFS });
  subscribe.mockReset().mockResolvedValue(undefined);
});

it('aparelho sem autorização: avisa e oferece ativar', async () => {
  render(<SettingsPage />);

  expect(await screen.findByText(/Este aparelho ainda não recebe/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ativar neste aparelho' }));
  await waitFor(() => expect(subscribe).toHaveBeenCalled());
});

it('aparelho já autorizado não pede nada', async () => {
  estadoDoPush = { ...estadoDoPush, isSubscribed: true, permission: 'granted' };

  render(<SettingsPage />);

  await screen.findByText('Push');
  expect(screen.queryByRole('button', { name: 'Ativar neste aparelho' })).not.toBeInTheDocument();
});

it('navegador bloqueado explica que a permissão está no navegador', async () => {
  estadoDoPush = { ...estadoDoPush, permission: 'denied' };

  render(<SettingsPage />);

  expect(await screen.findByText(/bloqueou os avisos deste site/)).toBeInTheDocument();
});
