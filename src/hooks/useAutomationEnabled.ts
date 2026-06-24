// src/hooks/useAutomationEnabled.ts
import { useQuery } from '@tanstack/react-query';
import { useStore } from './useStore';
import agentsService from '../services/agents';

/**
 * Progressive disclosure for the "Automação" nav section.
 * Returns true only when the current store has a WhatsApp signal AND >=1 agent.
 * Never throws and never blocks render: while loading or on error it returns false.
 */
export function useAutomationEnabled(): boolean {
  const { store } = useStore();

  const hasWhatsApp = Boolean(store?.whatsapp_number) || (store?.integrations_count ?? 0) > 0;

  // `/agents/` é account-scoped (só o Authorization Token, sem param de loja),
  // então a lista cacheada vale para qualquer loja da conta — NÃO adicione store id
  // à queryKey "pra corrigir multi-tenant": o endpoint ignora.
  const { data: agents } = useQuery({
    queryKey: ['agents', 'gating'],
    queryFn: () => agentsService.getAgents(),
    enabled: hasWhatsApp,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const hasAgent = (agents?.length ?? 0) > 0;
  return hasWhatsApp && hasAgent;
}
