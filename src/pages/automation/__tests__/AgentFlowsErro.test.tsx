/**
 * A lista de fluxos do robô não pode transformar uma falha de rede em
 * "automação vazia".
 *
 * `AgentFlowsPage` carrega os fluxos por `useState`/`useEffect`. No erro, só
 * disparava um `toast` (que some em segundos) e deixava `flows` em `[]`, com
 * `loading = false`. A tela então mostrava o `KpiGrid` zerado ("Fluxos: 0",
 * "Ativos: 0", "Execuções: 0") e o vazio confiante "Nenhum flow criado · Criar
 * Primeiro Flow" — dizendo ao lojista que ele não tem automação nenhuma quando,
 * na verdade, a busca caiu. É o mesmo "vazio/zeros enganoso" que o loop já
 * corrigiu em Clientes, Cardápio, Sessões, Agendadas, Logs de automação,
 * Conexões, Conversas e Zonas de entrega. Aqui garantimos o erro acionável
 * (com "Tentar novamente") no lugar do vazio e dos zeros, e que o caminho de
 * sucesso e o vazio legítimo seguem intactos.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const listMock = jest.fn();
jest.mock('../../../services/automation', () => ({
  __esModule: true,
  agentFlowService: {
    list: (...args: unknown[]) => listMock(...args),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

// A loja selecionada é mutável para simular a troca de loja do operador.
let mockStoreId = 'store-1';
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: mockStoreId }),
  useConfirm: () => [null, jest.fn()],
}));

import AgentFlowsPage from '../AgentFlowsPage';

const umFluxo = () => ({
  id: 'f1',
  name: 'Boas-vindas',
  description: 'Fluxo de abertura',
  store: 'store-1',
  flow_json: { nodes: [], edges: [] },
  is_active: true,
  is_default: true,
  version: '1',
  total_executions: 12,
  success_rate: 0.8,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
});

beforeEach(() => {
  listMock.mockReset();
  mockStoreId = 'store-1';
});

test('falha sem cache → erro acionável, nunca o vazio/zeros enganoso de "nenhum flow criado"', async () => {
  listMock.mockRejectedValueOnce(new Error('500'));

  render(
    <MemoryRouter>
      <AgentFlowsPage />
    </MemoryRouter>,
  );

  // Mostra o erro acionável...
  expect(
    await screen.findByText(/não foi possível carregar os fluxos/i),
  ).toBeInTheDocument();
  // ...e nunca o vazio confiante, que leria como "você não tem automação".
  expect(screen.queryByText(/nenhum flow criado/i)).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /criar primeiro flow/i }),
  ).not.toBeInTheDocument();
  // ...nem os KPIs zerados (o rótulo 'Fluxos' do KpiGrid some na falha; o
  // título "Fluxos do robô" é outro nó de texto).
  expect(screen.queryByText('Fluxos')).not.toBeInTheDocument();
});

test('"Tentar novamente" refaz a busca e traz os fluxos quando ela volta', async () => {
  listMock.mockRejectedValueOnce(new Error('500'));

  render(
    <MemoryRouter>
      <AgentFlowsPage />
    </MemoryRouter>,
  );

  await screen.findByText(/não foi possível carregar os fluxos/i);

  listMock.mockResolvedValueOnce({ results: [umFluxo()], count: 1 });
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

  expect(await screen.findByText('Boas-vindas')).toBeInTheDocument();
  await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  expect(
    screen.queryByText(/não foi possível carregar os fluxos/i),
  ).not.toBeInTheDocument();
});

test('busca que DEU CERTO e veio vazia mantém o "Nenhum flow criado" legítimo', async () => {
  listMock.mockResolvedValueOnce({ results: [], count: 0 });

  render(
    <MemoryRouter>
      <AgentFlowsPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText(/nenhum flow criado/i)).toBeInTheDocument();
  expect(
    screen.queryByText(/não foi possível carregar os fluxos/i),
  ).not.toBeInTheDocument();
});

test('trocar de loja não vaza os fluxos da loja anterior (nem na nova carga, nem se ela falhar)', async () => {
  // Loja 1 carrega e mostra o seu fluxo.
  listMock.mockResolvedValueOnce({ results: [umFluxo()], count: 1 });
  const { rerender } = render(
    <MemoryRouter>
      <AgentFlowsPage />
    </MemoryRouter>,
  );
  expect(await screen.findByText('Boas-vindas')).toBeInTheDocument();

  // Operador troca para a loja 2; a busca da loja 2 fica pendente.
  let rejeitarLoja2: (e: unknown) => void = () => {};
  listMock.mockReturnValueOnce(
    new Promise((_, rej) => {
      rejeitarLoja2 = rej;
    }),
  );
  mockStoreId = 'store-2';
  rerender(
    <MemoryRouter>
      <AgentFlowsPage />
    </MemoryRouter>,
  );

  // Durante a carga da loja 2, o fluxo da loja 1 NÃO pode seguir na tela
  // (com editar/ativar/excluir) sob a loja recém-selecionada.
  await waitFor(() =>
    expect(screen.queryByText('Boas-vindas')).not.toBeInTheDocument(),
  );

  // E se a busca da loja 2 falhar, continua sem o fluxo da loja 1 — erro
  // acionável, nunca o cache da outra loja mantido indefinidamente.
  await act(async () => {
    rejeitarLoja2(new Error('500'));
    await Promise.resolve();
  });
  expect(
    await screen.findByText(/não foi possível carregar os fluxos/i),
  ).toBeInTheDocument();
  expect(screen.queryByText('Boas-vindas')).not.toBeInTheDocument();
});

test('sucesso → renderiza os fluxos, sem estado de erro', async () => {
  listMock.mockResolvedValueOnce({ results: [umFluxo()], count: 1 });

  render(
    <MemoryRouter>
      <AgentFlowsPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Boas-vindas')).toBeInTheDocument();
  expect(
    screen.queryByText(/não foi possível carregar os fluxos/i),
  ).not.toBeInTheDocument();
});
