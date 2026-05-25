import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AgentForm } from '../../components/agents';
import agentsService, { CreateAgentData } from '../../services/agents';
import { whatsappService } from '../../services';

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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/agents')}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-zinc-500" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-[var(--dark-text-primary,#FAF9F7)]">
            Criar Novo Agente
          </h1>
          <p className="text-zinc-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
            Configure um novo agente de inteligência artificial
          </p>
        </div>
      </div>

      {/* Erro de submissão */}
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {submitError}
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] rounded-xl border border-zinc-200 dark:border-[var(--dark-border,#2a2a2a)] overflow-hidden">
        <AgentForm
          whatsappAccounts={whatsappAccounts}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/agents')}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default AgentCreatePage;
