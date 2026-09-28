/**
 * Os logs de automação não podem transformar uma falha de rede no confiante
 * "Nenhum registro".
 *
 * `AutomationLogsPage` carrega os logs por `useState`/`useEffect`. No erro, só
 * disparava um `toast` (que some em segundos) e deixava `logs` em `[]`, com
 * `loading = false`. A `Tabela` então mostrava o vazio confiante "Nenhum
 * registro · Os registros aparecem aqui conforme o robô trabalha." — dizendo ao
 * lojista que o robô não fez nada quando, na verdade, a requisição caiu. É o
 * mesmo engano de "vazio enganoso" que o loop já corrigiu em Sessões (#204),
 * Agendadas (#205) e Cardápio (#202). Aqui garantimos o erro acionável (com
 * "Tentar novamente") no lugar do vazio, e que o caminho de sucesso continua
 * mostrando os registros reais.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const listMock = jest.fn();
const statsMock = jest.fn();
const companiesListMock = jest.fn();
jest.mock('../../../services/automation', () => ({
  __esModule: true,
  automationLogService: {
    list: (...args: unknown[]) => listMock(...args),
    getStats: (...args: unknown[]) => statsMock(...args),
  },
  companyProfileService: {
    list: (...args: unknown[]) => companiesListMock(...args),
  },
}));

jest.mock('react-hot-toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

import AutomationLogsPage from '../AutomationLogsPage';

const umLog = () => ({
  id: 'l1',
  company_name: 'Loja da Maria',
  action_type: 'message_sent',
  phone_number: '11999999999',
  description: 'Mensagem enviada ao cliente',
  is_error: false,
  created_at: '2026-09-20T12:00:00Z',
});

beforeEach(() => {
  listMock.mockReset();
  statsMock.mockReset();
  companiesListMock.mockReset();
  companiesListMock.mockResolvedValue({ results: [], count: 0 });
});

test('falha sem cache → erro acionável, nunca o vazio enganoso de "nenhum registro"', async () => {
  listMock.mockRejectedValueOnce(new Error('500'));

  render(
    <MemoryRouter>
      <AutomationLogsPage />
    </MemoryRouter>,
  );

  // Mostra o erro acionável...
  expect(
    await screen.findByText(/não foi possível carregar os registros/i),
  ).toBeInTheDocument();
  // ...e nunca o vazio confiante, que leria como "o robô não fez nada".
  expect(screen.queryByText(/nenhum registro/i)).not.toBeInTheDocument();

  // O botão refaz a busca.
  listMock.mockResolvedValueOnce({ results: [], count: 0 });
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
});

test('rejeição de requisição obsoleta não sobrepõe o resultado da mais recente', async () => {
  // Cenário de corrida: ao trocar filtros rápido, uma busca antiga ainda em voo
  // rejeita DEPOIS que a mais recente já respondeu (vazio legítimo). A rejeição
  // obsoleta não pode ligar o estado de erro e apagar o vazio válido.
  let rejeitarObsoleta: (e: unknown) => void = () => {};
  const obsoleta = new Promise((_, reject) => {
    rejeitarObsoleta = reject;
  });
  listMock
    .mockReturnValueOnce(obsoleta) // 1ª busca (montagem) — fica em voo e rejeita depois
    .mockResolvedValueOnce({ results: [], count: 0 }); // 2ª busca (filtro) — a mais recente

  render(
    <MemoryRouter>
      <AutomationLogsPage />
    </MemoryRouter>,
  );

  // Abre os filtros e digita um telefone → dispara a 2ª busca (a mais recente).
  fireEvent.click(screen.getByRole('button', { name: /filtros/i }));
  fireEvent.change(screen.getByPlaceholderText(/telefone/i), { target: { value: '11' } });

  // A mais recente resolveu vazio → aparece o vazio legítimo.
  expect(await screen.findByText(/nenhum registro/i)).toBeInTheDocument();

  // Agora a 1ª (obsoleta) rejeita: NÃO pode virar "erro ao carregar".
  await act(async () => {
    rejeitarObsoleta(new Error('500'));
    await Promise.resolve();
  });

  expect(
    screen.queryByText(/não foi possível carregar os registros/i),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/nenhum registro/i)).toBeInTheDocument();
});

test('carga inicial vazia + troca de filtro que falha → erro acionável, não "nenhum registro"', async () => {
  // O latch "já carregou" não pode valer para OUTRA consulta: uma busca inicial
  // que deu certo e veio vazia (vazio legítimo) não pode fazer uma troca de
  // filtro que FALHA cair de novo no "Nenhum registro" — os logs em memória são
  // da consulta anterior. A troca de parâmetros invalida o latch, então a falha
  // na nova consulta volta a ser acionável.
  listMock
    .mockResolvedValueOnce({ results: [], count: 0 }) // carga inicial: vazio legítimo
    .mockRejectedValueOnce(new Error('500')); // busca do novo filtro: falha

  render(
    <MemoryRouter>
      <AutomationLogsPage />
    </MemoryRouter>,
  );

  // Vazio legítimo da carga inicial.
  expect(await screen.findByText(/nenhum registro/i)).toBeInTheDocument();

  // Troca o filtro de telefone → nova consulta, que falha.
  fireEvent.click(screen.getByRole('button', { name: /filtros/i }));
  fireEvent.change(screen.getByPlaceholderText(/telefone/i), { target: { value: '11' } });

  // Deve mostrar o erro acionável da nova consulta, NUNCA o "nenhum registro"
  // herdado da consulta anterior.
  expect(
    await screen.findByText(/não foi possível carregar os registros/i),
  ).toBeInTheDocument();
  expect(screen.queryByText(/nenhum registro/i)).not.toBeInTheDocument();
});

test('sucesso → renderiza os registros, sem estado de erro', async () => {
  listMock.mockResolvedValue({ results: [umLog()], count: 1 });

  render(
    <MemoryRouter>
      <AutomationLogsPage />
    </MemoryRouter>,
  );

  expect(
    (await screen.findAllByText(/mensagem enviada ao cliente/i)).length,
  ).toBeGreaterThan(0);
  expect(
    screen.queryByText(/não foi possível carregar os registros/i),
  ).not.toBeInTheDocument();
});
