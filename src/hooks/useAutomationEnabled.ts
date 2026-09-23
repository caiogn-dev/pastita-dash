// src/hooks/useAutomationEnabled.ts
import { useQuery } from '@tanstack/react-query';
import { useStore } from './useStore';
import agentsService from '../services/agents';

/**
 * Progressive disclosure da seção "Automação" na navegação.
 *
 * O portão perguntava `whatsapp_number || integrations_count > 0`. Os dois
 * lados mentem: `whatsapp_number` é texto que o dono digita (em 22/09 quatro
 * lojas tinham número escrito e nenhuma WABA), e `integrations_count` conta
 * qualquer integração ativa — loja que conectou só o Mercado Pago abria as dez
 * telas de automação. Agora quem responde é `whatsapp_conectado`, calculado no
 * backend pela conta conectada, o mesmo valor que o checklist de onboarding usa.
 *
 * Falha ABERTO: se a lista de agentes errar, quem já tem WhatsApp conectado
 * mantém o menu. Fechar em erro apagava dez telas em silêncio e o dono ficava
 * procurando o que sumiu.
 */
export function useAutomationEnabled(): boolean {
  const { store } = useStore();

  const whatsappConectado = Boolean(store?.whatsapp_conectado);

  // `/agents/` é account-scoped (só o Authorization Token, sem param de loja),
  // então a lista cacheada vale para qualquer loja da conta — NÃO adicione store id
  // à queryKey "pra corrigir multi-tenant": o endpoint ignora.
  const { data: agents, isError } = useQuery({
    queryKey: ['agents', 'gating'],
    queryFn: () => agentsService.getAgents(),
    enabled: whatsappConectado,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!whatsappConectado) return false;
  if (isError) return true;
  return (agents?.length ?? 0) > 0;
}
