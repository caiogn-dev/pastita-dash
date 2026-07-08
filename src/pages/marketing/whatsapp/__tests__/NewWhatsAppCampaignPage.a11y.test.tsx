import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NewWhatsAppCampaignPage } from '../NewWhatsAppCampaignPage';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../../services', () => ({
  __esModule: true,
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock('../../../../hooks', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'loja-1', storeName: 'Loja Teste' }),
}));

const getAccounts = jest.fn();
jest.mock('../../../../services/whatsapp', () => ({
  __esModule: true,
  default: {
    getAccounts: (...args: unknown[]) => getAccounts(...args),
    getTemplates: jest.fn().mockResolvedValue({ data: { results: [] } }),
    syncTemplates: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../../../services/campaigns', () => ({
  __esModule: true,
  campaignsService: {
    getContactLists: jest.fn().mockResolvedValue({ results: [] }),
    getSystemContacts: jest.fn().mockResolvedValue({ results: [] }),
  },
}));

jest.mock('../../../../services/storesApi', () => ({
  __esModule: true,
  getProducts: jest.fn().mockResolvedValue([]),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <NewWhatsAppCampaignPage />
    </MemoryRouter>
  );

describe('NewWhatsAppCampaignPage — acessibilidade dos botões icon-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccounts.mockResolvedValue({
      data: { results: [{ id: 'acc-1', name: 'Conta 1', status: 'active' }] },
    });
  });

  it('expõe nome acessível no botão de voltar do cabeçalho', async () => {
    renderPage();

    // O botão de voltar do cabeçalho é icon-only e precisa de nome acessível.
    const voltar = await screen.findByRole('button', { name: /voltar para campanhas whatsapp/i });
    expect(voltar).toBeInTheDocument();
  });

  it('expõe nome acessível nos botões de adicionar e remover contato', async () => {
    renderPage();

    // Avança: Conta (auto-selecionada) -> Mensagem
    await screen.findByRole('button', { name: /voltar para campanhas whatsapp/i });
    fireEvent.click(await screen.findByRole('button', { name: /^continuar$/i }));

    // Mensagem: escolhe texto livre e digita conteúdo
    fireEvent.click(await screen.findByText(/texto livre/i));
    const textarea = await screen.findByPlaceholderText(/digite sua mensagem aqui/i);
    fireEvent.change(textarea, { target: { value: 'Olá!' } });
    fireEvent.click(await screen.findByRole('button', { name: /^continuar$/i }));

    // Destinatários: botão de adicionar contato precisa de nome acessível
    const adicionar = await screen.findByRole('button', { name: /adicionar contato/i });
    const phoneInput = screen.getByPlaceholderText(/telefone/i);
    fireEvent.change(phoneInput, { target: { value: '5511999999999' } });
    fireEvent.click(adicionar);

    // Botão de remover contato icon-only precisa de nome acessível
    const remover = await screen.findByRole('button', { name: /remover contato 5511999999999/i });
    expect(remover).toBeInTheDocument();
  });
});
