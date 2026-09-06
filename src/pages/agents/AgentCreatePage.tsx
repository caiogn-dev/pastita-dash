import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AgentForm } from '../../components/agents';
import agentsService, { CreateAgentData } from '../../services/agents';
import { whatsappService } from '../../services';
import { PageShell } from '../../components/ui';

interface WhatsAppAccount {
  id: string;
  name: string;
  phone_number: string;
}

export const AgentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await whatsappService.getAccounts();
        // Type assertion needed because API response shape varies
        const data = response.data as { results?: WhatsAppAccount[] } | WhatsAppAccount[] | undefined;
        const accounts = Array.isArray(data) ? data : (data?.results ?? []);
        setWhatsappAccounts(accounts);
      } catch (error) {
        console.error('Erro ao carregar contas WhatsApp:', error);
      }
    };
    loadAccounts();
  }, []);

  const handleSubmit = async (data: CreateAgentData) => {
    setIsLoading(true);
    setSubmitError(null);
    try {
      const newAgent = await agentsService.createAgent(data);
      navigate(`/agents/${newAgent.id}`);
    } catch (error) {
      console.error('Erro ao criar agente:', error);
      setSubmitError(error instanceof Error ? error.message : 'Erro ao criar agente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      className="mx-auto max-w-4xl"
      trilha={[{ rotulo: 'Agentes', href: '/agents' }, { rotulo: 'Novo agente' }]}
      titulo="Novo agente"
    >

      {/* Erro de submissão */}
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {submitError}
        </div>
      )}

      {/* Form */}
      <div className="bg-surface rounded-xl border border-zinc-200 dark:border-[var(--dark-border,#2a2a2a)] overflow-hidden">
        <AgentForm
          whatsappAccounts={whatsappAccounts}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/agents')}
          isLoading={isLoading}
        />
      </div>
    </PageShell>
  );
};

export default AgentCreatePage;
