// src/hooks/__tests__/useAutomationEnabled.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAutomationEnabled } from '../useAutomationEnabled';

const mockUseStore = jest.fn();
jest.mock('../useStore', () => ({ useStore: () => mockUseStore() }));

const mockGetAgents = jest.fn();
jest.mock('../../services/agents', () => ({
  __esModule: true,
  default: { getAgents: () => mockGetAgents() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockUseStore.mockReset();
  mockGetAgents.mockReset();
});

it('número digitado não abre o portão', async () => {
  // `whatsapp_number` é texto que o dono digita. Em 22/09 quatro lojas tinham
  // número escrito e nenhuma WABA conectada.
  mockUseStore.mockReturnValue({
    store: { whatsapp_number: '5563999999999', whatsapp_conectado: false, integrations_count: 0 },
  });
  mockGetAgents.mockResolvedValue([{ id: 'a1' }]);
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  await waitFor(() => expect(result.current).toBe(false));
  expect(mockGetAgents).not.toHaveBeenCalled();
});

it('integração de pagamento não abre o portão', async () => {
  // `integrations_count` conta qualquer integração ativa — Mercado Pago
  // inclusive. Não é sinal de WhatsApp.
  mockUseStore.mockReturnValue({
    store: { whatsapp_number: '', whatsapp_conectado: false, integrations_count: 3 },
  });
  mockGetAgents.mockResolvedValue([{ id: 'a1' }]);
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  await waitFor(() => expect(result.current).toBe(false));
  expect(mockGetAgents).not.toHaveBeenCalled();
});

it('é falso com WhatsApp conectado e nenhum agente', async () => {
  mockUseStore.mockReturnValue({ store: { whatsapp_conectado: true } });
  mockGetAgents.mockResolvedValue([]);
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  await waitFor(() => expect(mockGetAgents).toHaveBeenCalled());
  expect(result.current).toBe(false);
});

it('é verdadeiro com WhatsApp conectado e pelo menos um agente', async () => {
  mockUseStore.mockReturnValue({ store: { whatsapp_conectado: true } });
  mockGetAgents.mockResolvedValue([{ id: 'a1' }]);
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  await waitFor(() => expect(result.current).toBe(true));
});

it('erro ao listar agentes NÃO some com o menu', async () => {
  // O portão falhava fechado: uma consulta que erra apagava dez telas da
  // navegação sem dizer nada, e o dono ficava procurando o que sumiu. Quem já
  // tem WhatsApp conectado não perde o menu porque a lista de agentes caiu.
  mockUseStore.mockReturnValue({ store: { whatsapp_conectado: true } });
  mockGetAgents.mockRejectedValue(new Error('500'));
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  await waitFor(() => expect(result.current).toBe(true));
});

it('é falso (nunca lança) enquanto carrega', () => {
  mockUseStore.mockReturnValue({ store: { whatsapp_conectado: true } });
  mockGetAgents.mockReturnValue(new Promise(() => {})); // nunca resolve
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  expect(result.current).toBe(false);
});
