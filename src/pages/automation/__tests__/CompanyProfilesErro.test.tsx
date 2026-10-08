/**
 * A lista de perfis de empresa não pode transformar uma falha de rede no
 * "nenhum perfil configurado".
 *
 * `CompanyProfilesPage` carrega os perfis por `useState`/`useEffect`. No erro,
 * só disparava um `toast` (que some em segundos) e deixava `profiles` em `[]`,
 * com `loading = false`. A tela então mostrava o vazio confiante
 * "Nenhum perfil configurado · Crie um perfil de empresa para começar a usar
 * automações", com o botão "Criar Perfil" — dizendo a uma loja que JÁ tem a
 * automação montada que ela não tem perfil nenhum, e convidando-a a recriar o
 * primeiro. É o mesmo "vazio enganoso" já corrigido em Clientes (#199),
 * Cardápio (#202), Sessões (#204), Agendadas (#205) e tantas outras. Aqui
 * garantimos o erro acionável (com "Tentar novamente") no lugar do vazio, e que
 * o caminho de sucesso continua mostrando os perfis reais.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// `useConfirm` vem de `../../hooks`, que arrasta `api.ts` (exige VITE_API_URL).
// O diálogo de confirmação não participa dos estados de lista testados aqui.
jest.mock('../../../hooks', () => ({
  __esModule: true,
  useConfirm: () => [null, jest.fn().mockResolvedValue(false)] as const,
}));

const listMock = jest.fn();
jest.mock('../../../services/automation', () => ({
  __esModule: true,
  companyProfileService: {
    list: (...args: unknown[]) => listMock(...args),
    regenerateApiKey: jest.fn(),
  },
  businessTypeLabels: {},
}));

jest.mock('react-hot-toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

import CompanyProfilesPage from '../CompanyProfilesPage';

const umPerfil = () => ({
  id: 'c1',
  company_name: 'Loja da Maria',
  account_phone: '11999999999',
  business_type: 'restaurant',
  auto_reply_enabled: true,
});

beforeEach(() => {
  listMock.mockReset();
});

test('falha sem cache → erro acionável, nunca o vazio enganoso de "nenhum perfil configurado"', async () => {
  listMock.mockRejectedValueOnce(new Error('500'));

  render(
    <MemoryRouter>
      <CompanyProfilesPage />
    </MemoryRouter>,
  );

  // Mostra o erro acionável...
  expect(
    await screen.findByText(/não foi possível carregar os perfis/i),
  ).toBeInTheDocument();
  // ...e nunca o vazio confiante, que leria como "você não tem automação".
  expect(screen.queryByText(/nenhum perfil configurado/i)).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /^criar perfil$/i }),
  ).not.toBeInTheDocument();

  // O botão refaz a busca e traz o perfil real.
  listMock.mockResolvedValueOnce({ results: [umPerfil()], count: 1 });
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('Loja da Maria')).toBeInTheDocument();
});

test('busca vazia legítima mantém o "nenhum perfil configurado"', async () => {
  listMock.mockResolvedValue({ results: [], count: 0 });

  render(
    <MemoryRouter>
      <CompanyProfilesPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText(/nenhum perfil configurado/i)).toBeInTheDocument();
  expect(
    screen.queryByText(/não foi possível carregar os perfis/i),
  ).not.toBeInTheDocument();
});

test('falha ao paginar não deixa a página anterior na tela como se fosse a nova', async () => {
  // Trocar de página é uma consulta nova: os dados da página 1 não valem como
  // cache da página 2. Sem resetar o latch de sucesso, uma falha ao avançar
  // deixava a lista da página 1 na tela sob o indicador da página 2, sem o
  // FalhaAoCarregar e sem o "Tentar novamente" — o vazio/erro enganoso de novo,
  // agora disfarçado de dado real.
  listMock
    .mockResolvedValueOnce({ results: [umPerfil()], count: 25 }) // página 1 ok (há 2ª página)
    .mockRejectedValueOnce(new Error('500')); // página 2 falha

  render(
    <MemoryRouter>
      <CompanyProfilesPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Loja da Maria')).toBeInTheDocument();

  // Avança para a página 2, cuja busca vai falhar.
  fireEvent.click(screen.getByRole('button', { name: /próximo/i }));

  // A falha da página 2 mostra o erro acionável...
  expect(
    await screen.findByText(/não foi possível carregar os perfis/i),
  ).toBeInTheDocument();
  // ...e NÃO mantém a lista da página 1 como se fosse a página 2.
  expect(screen.queryByText('Loja da Maria')).not.toBeInTheDocument();
});

test('sucesso → renderiza os perfis, sem estado de erro', async () => {
  listMock.mockResolvedValue({ results: [umPerfil()], count: 1 });

  render(
    <MemoryRouter>
      <CompanyProfilesPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Loja da Maria')).toBeInTheDocument();
  expect(
    screen.queryByText(/não foi possível carregar os perfis/i),
  ).not.toBeInTheDocument();
});
