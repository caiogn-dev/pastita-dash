import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CpuChipIcon,
  ArrowPathIcon,
  // Ícones pelo que o ESTADO significa, não por decoração:
  // Bolt        → ativo é o agente disparando resposta sozinho
  // PauseCircle → inativo é pausa deliberada, não erro
  // PencilSquare→ rascunho é algo ainda sendo escrito
  SignalIcon,
  PauseCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';
import { PageShell, KpiGrid } from '../../components/ui';
import { AgentCard } from '../../components/agents';
import agentsService, { Agent, PROVIDER_CONFIGS } from '../../services/agents';
import type { AgentProvider } from '../../services/agents';
import { getErrorMessage } from '../../services';
import { useConfirm } from '../../hooks';

type StatusFilter = 'all' | 'active' | 'inactive' | 'draft';
type ProviderFilter = 'all' | AgentProvider;

export const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [ConfirmDialog, confirm] = useConfirm();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadAgents = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await agentsService.getAgents();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[AgentsPage] Erro ao carregar agentes:', error);
      setLoadError(msg);
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleToggleStatus = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    try {
      await agentsService.updateAgent(id, { status: newStatus });
      toast.success(`Agente ${newStatus === 'active' ? 'ativado' : 'desativado'}`);
    } catch (error) {
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status: agent.status } : a));
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir agente',
      message: 'Tem certeza que deseja excluir este agente?',
    });
    if (!confirmed) return;

    try {
      await agentsService.deleteAgent(id);
      setAgents(prev => prev.filter(a => a.id !== id));
      toast.success('Agente excluído');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || agent.provider === providerFilter;
    
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    inactive: agents.filter(a => a.status === 'inactive').length,
    draft: agents.filter(a => a.status === 'draft').length,
  };

  return (
    <PageShell
      trilha={[{ rotulo: 'Automação' }, { rotulo: 'Agentes IA' }]}
      titulo="Agentes IA"
      descricao="Quem responde o cliente no WhatsApp quando você não está: tom de voz, regras e limites."
      className="mx-auto max-w-7xl"
      acoes={
        <button
          onClick={() => navigate('/agents/new')}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium",
            "bg-primary-600 hover:bg-primary-700 text-white",
            "transition-colors shadow-sm"
          )}
        >
          <PlusIcon className="w-5 h-5" />
          Novo Agente
        </button>
      }
    >
      {/* Os quatro cards eram <div> com cor crua (green-600, gray-500,
          yellow-500) e fundo hardcoded — furavam o tema e não diziam o que
          cada estado significa. Aqui "ativo" tem consequência: é o agente que
          está atendendo cliente de verdade agora. */}
      <KpiGrid
        itens={[
          {
            label: 'Total de agentes',
            value: stats.total,
            definicao: 'Todos os agentes criados nesta conta.',
            icone: <CpuChipIcon />,
          },
          {
            label: 'Ativos',
            value: stats.active,
            definicao: 'Respondendo clientes agora, sem você no meio.',
            icone: <SignalIcon />,
            tone: 'success',
          },
          {
            label: 'Inativos',
            value: stats.inactive,
            definicao: 'Configurados mas desligados — não recebem mensagem.',
            icone: <PauseCircleIcon />,
          },
          {
            label: 'Rascunhos',
            value: stats.draft,
            definicao: 'Ainda sem configuração completa para entrar no ar.',
            icone: <PencilSquareIcon />,
            tone: stats.draft > 0 ? 'warning' : 'default',
          },
        ]}
      />

      {/* Search & Filters */}
      <div className="flex flex-row max-sm:flex-col gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar agentes..."
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-lg border",
              "bg-surface",
              "text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)] placeholder-zinc-400",
              "border-zinc-200 dark:border-[var(--dark-border,#2a2a2a)]",
              "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            )}
          />
        </div>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border",
            "bg-surface",
            "text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)]",
            "border-zinc-200 dark:border-[var(--dark-border,#2a2a2a)]",
            "hover:bg-zinc-50 dark:hover:bg-[var(--dark-bg-hover,#161616)]",
            showFilters && "bg-zinc-100 dark:bg-[var(--dark-bg-hover,#161616)]"
          )}
        >
          <FunnelIcon className="w-5 h-5" />
          Filtros
        </button>

        {/* Refresh */}
        <button
          type="button"
          aria-label="Atualizar agentes"
          onClick={loadAgents}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border",
            "bg-surface",
            "text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)]",
            "border-zinc-200 dark:border-[var(--dark-border,#2a2a2a)]",
            "hover:bg-zinc-50 dark:hover:bg-[var(--dark-bg-hover,#161616)]",
            "disabled:opacity-50"
          )}
        >
          <ArrowPathIcon className={cn("w-5 h-5", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-surface rounded-xl border border-zinc-200 dark:border-[var(--dark-border,#2a2a2a)] p-4 mb-6">
          <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border",
                  "bg-surface dark:bg-[var(--dark-bg-hover,#161616)]",
                  "text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)]",
                  "border-zinc-200 dark:border-[var(--dark-border,#2a2a2a)]"
                )}
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="draft">Rascunhos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-2">
                Provedor
              </label>
              <select
                value={providerFilter}
                onChange={e => setProviderFilter(e.target.value as ProviderFilter)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border",
                  "bg-surface dark:bg-[var(--dark-bg-hover,#161616)]",
                  "text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)]",
                  "border-zinc-200 dark:border-[var(--dark-border,#2a2a2a)]"
                )}
              >
                <option value="all">Todos</option>
                {(Object.entries(PROVIDER_CONFIGS) as [AgentProvider, { name: string }][]).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error banner — mostra o erro real em vez de lista vazia silenciosa */}
      {loadError && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          <p className="font-semibold">Erro ao carregar agentes:</p>
          <p className="text-sm mt-1 font-mono">{loadError}</p>
          <p className="text-xs mt-2 text-red-500">Abra o DevTools (F12) → Network → veja o request GET /api/v1/agents/ para detalhes.</p>
        </div>
      )}

      {/* Agents Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-surface rounded-xl border border-zinc-200 dark:border-[var(--dark-border,#2a2a2a)] h-64 animate-pulse"
            />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-16">
          <CpuChipIcon className="w-20 h-20 mx-auto text-zinc-200 dark:text-fg-token mb-4" />
          {agents.length === 0 ? (
            <>
              <p className="text-xl font-medium text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
                Nenhum agente criado
              </p>
              <p className="text-fg-muted-token dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-6">
                Crie seu primeiro agente IA para automatizar atendimentos
              </p>
              <button
                onClick={() => navigate('/agents/new')}
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium",
                  "bg-primary-600 hover:bg-primary-700 text-white",
                  "transition-colors"
                )}
              >
                <PlusIcon className="w-5 h-5" />
                Criar Primeiro Agente
              </button>
            </>
          ) : (
            <>
              <p className="text-xl font-medium text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
                Nenhum resultado encontrado
              </p>
              <p className="text-fg-muted-token dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                Tente ajustar os filtros ou termo de busca
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-6">
          {filteredAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={id => navigate(`/agents/${id}`)}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onTest={id => navigate(`/agents/${id}/test`)}
              onViewConversations={id => navigate(`/agents/${id}/conversations`)}
            />
          ))}
        </div>
      )}
      {ConfirmDialog}
    </PageShell>
  );
};

export default AgentsPage;
