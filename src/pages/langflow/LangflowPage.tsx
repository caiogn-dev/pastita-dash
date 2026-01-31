import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PlayIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Header } from '../../components/layout';
import { Card, Button, Table, StatusBadge, Modal, Input, Textarea, Select, PageLoading } from '../../components/common';
import { langflowService, getErrorMessage } from '../../services';
import { LangflowFlow, LangflowSession, LangflowLog } from '../../types';

export const LangflowPage: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<LangflowFlow[]>([]);
  const [sessions, setSessions] = useState<LangflowSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'flows' | 'sessions' | 'playground'>('flows');
  
  // Create Flow Modal
  const [createModal, setCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [flowForm, setFlowForm] = useState({
    name: '',
    description: '',
    flow_id: '',
    endpoint_url: '',
    status: 'inactive',
    timeout_seconds: 30,
  });

  // Playground
  const [selectedFlow, setSelectedFlow] = useState<string>('');
  const [playgroundMessage, setPlaygroundMessage] = useState('');
  const [playgroundResponse, setPlaygroundResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats Modal
  const [statsModal, setStatsModal] = useState<{ isOpen: boolean; flow: LangflowFlow | null; stats: any }>({
    isOpen: false,
    flow: null,
    stats: null,
  });

  // Logs Modal
  const [logsModal, setLogsModal] = useState<{ isOpen: boolean; flow: LangflowFlow | null; logs: LangflowLog[] }>({
    isOpen: false,
    flow: null,
    logs: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [flowsRes, sessionsRes] = await Promise.all([
        langflowService.getFlows(),
        langflowService.getSessions(),
      ]);
      setFlows(flowsRes.results);
      setSessions(sessionsRes.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newFlow = await langflowService.createFlow({
        name: flowForm.name,
        description: flowForm.description,
        flow_id: flowForm.flow_id,
        endpoint_url: flowForm.endpoint_url,
        status: flowForm.status,
        timeout_seconds: flowForm.timeout_seconds,
      });
      setFlows([newFlow, ...flows]);
      toast.success('Flow criado com sucesso!');
      setCreateModal(false);
      setFlowForm({
        name: '',
        description: '',
        flow_id: '',
        endpoint_url: '',
        status: 'inactive',
        timeout_seconds: 30,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (flow: LangflowFlow) => {
    try {
      const newStatus = flow.status === 'active' ? 'inactive' : 'active';
      const updated = await langflowService.updateFlow(flow.id, { status: newStatus });
      setFlows(flows.map((f) => (f.id === updated.id ? updated : f)));
      toast.success(`Flow ${newStatus === 'active' ? 'ativado' : 'desativado'}!`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteFlow = async (flow: LangflowFlow) => {
    try {
      await langflowService.deleteFlow(flow.id);
      setFlows(flows.filter((f) => f.id !== flow.id));
      toast.success('Flow removido!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleViewStats = async (flow: LangflowFlow) => {
    try {
      const stats = await langflowService.getFlowStats(flow.id);
      setStatsModal({ isOpen: true, flow, stats });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleViewLogs = async (flow: LangflowFlow) => {
    try {
      const logs = await langflowService.getFlowLogs(flow.id);
      setLogsModal({ isOpen: true, flow, logs });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleProcessMessage = async () => {
    if (!selectedFlow || !playgroundMessage.trim()) return;
    setIsProcessing(true);
    setPlaygroundResponse('');
    try {
      const result = await langflowService.processMessage({
        flow_id: selectedFlow,
        message: playgroundMessage,
      });
      setPlaygroundResponse(result.response || 'Sem resposta');
    } catch (error) {
      toast.error(getErrorMessage(error));
      setPlaygroundResponse('Erro ao processar mensagem');
    } finally {
      setIsProcessing(false);
    }
  };

  const flowColumns = [
    {
      key: 'name',
      header: 'Nome',
      render: (flow: LangflowFlow) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{flow.name}</p>
          <p className="text-sm text-gray-500 dark:text-zinc-400 truncate max-w-xs">{flow.description || '-'}</p>
        </div>
      ),
    },
    {
      key: 'flow_id',
      header: 'Flow ID',
      render: (flow: LangflowFlow) => (
        <span className="font-mono text-sm text-gray-600 dark:text-zinc-400">{flow.flow_id.slice(0, 12)}...</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (flow: LangflowFlow) => <StatusBadge status={flow.status} />,
    },
    {
      key: 'accounts',
      header: 'Contas',
      render: (flow: LangflowFlow) => (
        <span className="text-sm text-gray-600 dark:text-zinc-400">{flow.accounts?.length || 0}</span>
      ),
    },
    {
      key: 'timeout',
      header: 'Timeout',
      render: (flow: LangflowFlow) => (
        <span className="text-sm text-gray-600 dark:text-zinc-400">{flow.timeout_seconds}s</span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (flow: LangflowFlow) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(flow);
            }}
          >
            {flow.status === 'active' ? 'Desativar' : 'Ativar'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleViewStats(flow);
            }}
            leftIcon={<ChartBarIcon className="w-4 h-4" />}
          >
            Stats
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleViewLogs(flow);
            }}
          >
            Logs
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteFlow(flow);
            }}
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  const sessionColumns = [
    {
      key: 'session_id',
      header: 'Session ID',
      render: (session: LangflowSession) => (
        <span className="font-mono text-sm text-gray-600 dark:text-zinc-400">{session.session_id.slice(0, 12)}...</span>
      ),
    },
    {
      key: 'flow',
      header: 'Flow',
      render: (session: LangflowSession) => {
        const flow = flows.find((f) => f.id === session.flow);
        return <span className="text-sm text-gray-900 dark:text-white">{flow?.name || session.flow}</span>;
      },
    },
    {
      key: 'interactions',
      header: 'Interações',
      render: (session: LangflowSession) => (
        <span className="text-sm text-gray-600 dark:text-zinc-400">{session.interaction_count}</span>
      ),
    },
    {
      key: 'last_interaction',
      header: 'Última Interação',
      render: (session: LangflowSession) => (
        <span className="text-sm text-gray-600 dark:text-zinc-400">
          {format(new Date(session.last_interaction_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div>
      <Header
        title="Langflow (LLM)"
        subtitle={`${flows.length} flow(s) | ${sessions.length} sessão(ões)`}
        actions={
          <Button
            leftIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => setCreateModal(true)}
          >
            Novo Flow
          </Button>
        }
      />

      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'flows'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('flows')}
          >
            Flows
          </button>
          <button
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'sessions'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('sessions')}
          >
            Sessões
          </button>
          <button
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'playground'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('playground')}
          >
            Playground
          </button>
        </div>

        {activeTab === 'flows' && (
          <Card noPadding>
            <Table
              columns={flowColumns}
              data={flows}
              keyExtractor={(flow) => flow.id}
              emptyMessage="Nenhum flow cadastrado"
            />
          </Card>
        )}

        {activeTab === 'sessions' && (
          <Card noPadding>
            <Table
              columns={sessionColumns}
              data={sessions}
              keyExtractor={(session) => session.id}
              emptyMessage="Nenhuma sessão encontrada"
            />
          </Card>
        )}

        {activeTab === 'playground' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Entrada">
              <div className="space-y-4">
                <Select
                  label="Flow"
                  value={selectedFlow}
                  onChange={(e) => setSelectedFlow(e.target.value)}
                  options={[
                    { value: '', label: 'Selecione um flow' },
                    ...flows.filter((f) => f.status === 'active').map((f) => ({ value: f.id, label: f.name })),
                  ]}
                />
                <Textarea
                  label="Mensagem"
                  rows={6}
                  value={playgroundMessage}
                  onChange={(e) => setPlaygroundMessage(e.target.value)}
                  placeholder="Digite sua mensagem para testar o flow..."
                />
                <Button
                  onClick={handleProcessMessage}
                  isLoading={isProcessing}
                  disabled={!selectedFlow || !playgroundMessage.trim()}
                  leftIcon={<PlayIcon className="w-5 h-5" />}
                >
                  Processar
                </Button>
              </div>
            </Card>

            <Card title="Resposta">
              <div className="min-h-[200px] bg-gray-50 dark:bg-black rounded-lg p-4">
                {isProcessing ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                ) : playgroundResponse ? (
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{playgroundResponse}</p>
                ) : (
                  <p className="text-gray-400 text-center">A resposta aparecerá aqui...</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Create Flow Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Novo Flow"
        size="md"
      >
        <form onSubmit={handleCreateFlow} className="space-y-4">
          <Input
            label="Nome"
            required
            value={flowForm.name}
            onChange={(e) => setFlowForm({ ...flowForm, name: e.target.value })}
            placeholder="Nome do flow"
          />
          <Textarea
            label="Descrição"
            rows={2}
            value={flowForm.description}
            onChange={(e) => setFlowForm({ ...flowForm, description: e.target.value })}
            placeholder="Descrição do flow"
          />
          <Input
            label="Flow ID (Langflow)"
            required
            value={flowForm.flow_id}
            onChange={(e) => setFlowForm({ ...flowForm, flow_id: e.target.value })}
            placeholder="ID do flow no Langflow"
          />
          <Input
            label="Endpoint URL"
            value={flowForm.endpoint_url}
            onChange={(e) => setFlowForm({ ...flowForm, endpoint_url: e.target.value })}
            placeholder="http://langflow:7860/api/v1/run/..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={flowForm.status}
              onChange={(e) => setFlowForm({ ...flowForm, status: e.target.value })}
              options={[
                { value: 'inactive', label: 'Inativo' },
                { value: 'active', label: 'Ativo' },
                { value: 'testing', label: 'Testando' },
              ]}
            />
            <Input
              label="Timeout (segundos)"
              type="number"
              min={5}
              max={120}
              value={flowForm.timeout_seconds}
              onChange={(e) => setFlowForm({ ...flowForm, timeout_seconds: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Criar Flow
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stats Modal */}
      <Modal
        isOpen={statsModal.isOpen}
        onClose={() => setStatsModal({ isOpen: false, flow: null, stats: null })}
        title={`Estatísticas - ${statsModal.flow?.name}`}
        size="md"
      >
        {statsModal.stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-black rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-zinc-400">Total de Interações</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsModal.stats.total_interactions}</p>
              </div>
              <div className="bg-gray-50 dark:bg-black rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-zinc-400">Tempo Médio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsModal.stats.avg_duration_ms}ms</p>
              </div>
              <div className="bg-gray-50 dark:bg-black rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-zinc-400">Sessões Ativas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsModal.stats.active_sessions}</p>
              </div>
              <div className="bg-gray-50 dark:bg-black rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-zinc-400">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {statsModal.stats.by_status?.success
                    ? Math.round((statsModal.stats.by_status.success / statsModal.stats.total_interactions) * 100)
                    : 0}%
                </p>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Por Status</h4>
              <div className="space-y-2">
                {Object.entries(statsModal.stats.by_status || {}).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-zinc-400 capitalize">{status}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Logs Modal */}
      <Modal
        isOpen={logsModal.isOpen}
        onClose={() => setLogsModal({ isOpen: false, flow: null, logs: [] })}
        title={`Logs - ${logsModal.flow?.name}`}
        size="lg"
      >
        <div className="max-h-96 overflow-y-auto space-y-3">
          {logsModal.logs.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-zinc-400 py-4">Nenhum log encontrado</p>
          ) : (
            logsModal.logs.map((log) => (
              <div key={log.id} className="bg-gray-50 dark:bg-black rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <StatusBadge status={log.status} />
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium text-gray-700 dark:text-zinc-300">Input:</span>{' '}
                    <span className="text-gray-600 dark:text-zinc-400">{log.input_message.slice(0, 100)}...</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-700 dark:text-zinc-300">Output:</span>{' '}
                    <span className="text-gray-600 dark:text-zinc-400">{log.output_message?.slice(0, 100) || '-'}...</span>
                  </p>
                  {log.duration_ms && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Duração: {log.duration_ms}ms</p>
                  )}
                  {log.error_message && (
                    <p className="text-xs text-red-500">Erro: {log.error_message}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
