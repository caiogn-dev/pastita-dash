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

it('is false when there is no WhatsApp signal', async () => {
  mockUseStore.mockReturnValue({ store: { whatsapp_number: '', integrations_count: 0 } });
  mockGetAgents.mockResolvedValue([{ id: 'a1' }]);
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  await waitFor(() => expect(result.current).toBe(false));
  expect(mockGetAgents).not.toHaveBeenCalled();
});

it('is false when WhatsApp is present but there are no agents', async () => {
  mockUseStore.mockReturnValue({ store: { whatsapp_number: '5563999999999', integrations_count: 0 } });
  mockGetAgents.mockResolvedValue([]);
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  await waitFor(() => expect(mockGetAgents).toHaveBeenCalled());
  expect(result.current).toBe(false);
});

it('is true when WhatsApp is present and there is at least one agent', async () => {
  mockUseStore.mockReturnValue({ store: { whatsapp_number: '5563999999999', integrations_count: 1 } });
  mockGetAgents.mockResolvedValue([{ id: 'a1' }]);
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  await waitFor(() => expect(result.current).toBe(true));
});

it('is false (never throws) while pending', () => {
  mockUseStore.mockReturnValue({ store: { whatsapp_number: '5563999999999', integrations_count: 1 } });
  mockGetAgents.mockReturnValue(new Promise(() => {})); // never resolves
  const { result } = renderHook(() => useAutomationEnabled(), { wrapper });
  expect(result.current).toBe(false);
});
