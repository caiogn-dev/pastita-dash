import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StorefrontPage } from '../StorefrontPage';
import * as storesApi from '../../../services/storesApi';

// ── Mocks das dependências que puxam import.meta / rede ──────────────────────
jest.mock('../../../services/storesApi', () => ({
  getStore: jest.fn(),
  updateStore: jest.fn(),
  updateStoreWithFiles: jest.fn(),
}));

jest.mock('../../../services', () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : 'erro'),
}));

jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'loja-x', stores: [] }),
}));

jest.mock('../../../utils/storefrontUrl', () => ({
  buildStorefrontUrl: () => 'https://x',
  buildStorefrontPreviewUrl: () => 'https://x',
}));

// templatesDoCardapio importa services/api (import.meta) — mock completo com a
// mesma lista de emergência usada em produção. (Lista inline: jest.mock é
// hoisted acima de qualquer const do módulo.)
jest.mock('../templatesDoCardapio', () => {
  const lista = [
    { id: 'fresh', label: 'Fresh', description: 'd', preview: '🥗' },
    { id: 'bold', label: 'Bold', description: 'd', preview: '🍔' },
    { id: 'classic', label: 'Classic', description: 'd', preview: '🍱' },
  ];
  return { TEMPLATES_DE_EMERGENCIA: lista, buscarTemplates: jest.fn().mockResolvedValue(lista) };
});

jest.mock('../../../components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PhonePreview: () => null,
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('react-hot-toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockedApi = storesApi as jest.Mocked<typeof storesApi>;

const cardDe = (label: string) => screen.getByText(label).closest('button') as HTMLButtonElement;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <StorefrontPage />
    </MemoryRouter>,
  );

const lojaFresh = {
  id: 's1',
  template: 'fresh',
  primary_color: '#111111',
  secondary_color: '#222222',
  tagline: '',
  custom_domain: '',
} as never;

describe('StorefrontPage — rollback do rascunho quando o save falha', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reverte o cartão de template selecionado quando o save falha', async () => {
    mockedApi.getStore.mockResolvedValue(lojaFresh);
    mockedApi.updateStore.mockRejectedValue(new Error('500 do domínio'));

    renderPage();

    // Carga: 'Fresh' é o template persistido → cartão destacado.
    await waitFor(() => expect(cardDe('Fresh').className).toContain('border-brand'));

    // Dono clica 'Bold' (otimista) → passa a destacado.
    fireEvent.click(cardDe('Bold'));
    expect(cardDe('Bold').className).toContain('border-brand');
    expect(cardDe('Fresh').className).not.toContain('border-brand');

    // Salva e FALHA.
    fireEvent.click(screen.getByText('Salvar storefront'));

    // Rollback: volta a 'Fresh' (o que o backend realmente tem), 'Bold' desmarca.
    await waitFor(() => expect(cardDe('Fresh').className).toContain('border-brand'));
    expect(cardDe('Bold').className).not.toContain('border-brand');
    expect(mockedApi.updateStore).toHaveBeenCalledTimes(1);
  });
});
