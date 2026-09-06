import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AgentChatTest } from '../../components/agents';
import agentsService, { AgentDetail } from '../../services/agents';
import { useStore } from '../../hooks';
import { PageShell } from '../../components/ui';

export const AgentTestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAgent = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const agentData = await agentsService.getAgent(id);
      setAgent(agentData);
    } catch (error) {
      console.error('Erro ao carregar agente:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  const { storeSlug } = useStore();

  const handleSendMessage = async (message: string, sessionId?: string) => {
    if (!id) throw new Error('ID do agente não encontrado');
    
    return await agentsService.processMessage(id, {
      message,
      session_id: sessionId,
      // A loja selecionada no painel: sem ela o agente responde "Cardápio
      // indisponível no momento" a qualquer pergunta sobre produto, e quem
      // testa conclui que o catálogo quebrou.
      store: storeSlug ?? undefined,
      context: { test: true },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-zinc-200 dark:bg-[var(--dark-border,#2a2a2a)] rounded mb-4" />
          <div className="h-[600px] bg-zinc-200 dark:bg-[var(--dark-border,#2a2a2a)] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <p className="text-xl font-medium text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
            Agente não encontrado
          </p>
          <button
            onClick={() => navigate('/agents')}
            className="text-primary-600 hover:text-primary-700"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  // Garantir que valores sejam strings
  const agentName = typeof agent.name === 'string' ? agent.name : JSON.stringify(agent.name);
  const agentProvider = typeof agent.provider === 'string' ? agent.provider : JSON.stringify(agent.provider);
  const agentModel = typeof agent.model_name === 'string' ? agent.model_name : JSON.stringify(agent.model_name);

  return (
    <PageShell
      className="mx-auto max-w-4xl"
      trilha={[
        { rotulo: 'Agentes', href: '/agents' },
        { rotulo: agentName, href: `/agents/${id}` },
        { rotulo: 'Teste' },
      ]}
      titulo={`Testar: ${agentName}`}
    >

      {/* Chat Test */}
      <AgentChatTest
        agentName={agentName}
        onSendMessage={handleSendMessage}
        onClearChat={() => {}}
      />
    </PageShell>
  );
};

export default AgentTestPage;
