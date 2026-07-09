import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import SubscriptionManagementPage from '../SubscriptionManagementPage';
import { cancelSubscription } from '../../../services/billing';

jest.mock('../../../services/billing', () => ({
  getSubscription: jest.fn().mockResolvedValue({ status: 'active', plan: 'pro' }),
  getPlans: jest.fn().mockResolvedValue([]),
  getCurrentInvoice: jest.fn().mockResolvedValue(null),
  listInvoices: jest.fn().mockResolvedValue([]),
  cancelSubscription: jest.fn().mockResolvedValue({ status: 'canceled' }),
  changePlan: jest.fn(),
}));

jest.mock('../../../hooks/useStore', () => ({
  useStore: () => ({ store: { slug: 'loja-teste' } }),
}));

jest.mock('../../../components/billing/PixInvoicePanel', () => ({
  __esModule: true,
  default: () => null,
}));

const mockedCancel = cancelSubscription as jest.Mock;

/**
 * Cancelar assinatura é a ação destrutiva mais crítica de billing:
 * deve usar o ConfirmModal do design system, nunca window.confirm nativo.
 */
describe('SubscriptionManagementPage — cancelamento com ConfirmModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => {
      throw new Error('window.confirm não deve ser usado');
    });
  });

  it('abre ConfirmModal (não window.confirm) e só cancela após confirmar', async () => {
    render(<SubscriptionManagementPage />);

    const cancelBtn = await screen.findByRole('button', { name: 'Cancelar assinatura' });
    fireEvent.click(cancelBtn);

    expect(window.confirm).not.toHaveBeenCalled();
    expect(mockedCancel).not.toHaveBeenCalled();

    // ConfirmModal visível com botão de confirmação
    const dialog = await screen.findByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /cancelar assinatura|confirmar/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith('loja-teste'));
  });

  it('não cancela quando o usuário desiste no ConfirmModal', async () => {
    render(<SubscriptionManagementPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /voltar|manter|não|cancelar$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockedCancel).not.toHaveBeenCalled();
  });
});
