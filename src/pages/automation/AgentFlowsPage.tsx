import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  PencilIcon,
  CpuChipIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Badge, Modal, Input, Loading } from '../../components/common';
import { agentFlowService, AgentFlow } from '../../services/automation';
import { useStore } from '../../hooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AgentFlowsPage: React.FC = () => {
  const { storeId } = useStore();
  const [flows, setFlows] = useState<AgentFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<AgentFlow | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    store: storeId || '',
    is_active: true,
    is_default: false,
    flow_json: '{}',
  });

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (storeId) params.store_id = storeId;
      const res = await agentFlowService.list(params);
      setFlows(res.results);
    } catch {
      toast.error('Erro ao carregar flows');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const openCreate = () => {
    setEditingFlow(null);
    setFormData({ name: '', description: '', store: storeId || '', is_active: true, is_default: false, flow_json: '{}' });
    setIsFormOpen(true);
  };

  const openEdit = (flow: AgentFlow) => {
    setEditingFlow(flow);
    setFormData({
      name: flow.name,
      description: flow.description || '',
      store: flow.store,
      is_active: flow.is_active,
      is_default: flow.is_default,
      flow_json: typeof flow.flow_json === 'string' ? flow.flow_json : JSON.stringify(flow.flow_json, null, 2),
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let flowJsonParsed: AgentFlow['flow_json'];
      try {
        flowJsonParsed = JSON.parse(formData.flow_json) as AgentFlow['flow_json'];
      } catch {
        toast.error('JSON do flow inválido');
        return;
      }
      const payload = { ...formData, flow_json: flowJsonParsed };
      if (editingFlow) {
        await agentFlowService.update(editingFlow.id, payload);
        toast.success('Flow atualizado!');
      } else {
        await agentFlowService.create(payload);
        toast.success('Flow criado!');
      }
      setIsFormOpen(false);
      loadFlows();
    } catch {
      toast.error('Erro ao salvar flow');
    }
  };

  const handleToggleActive = async (flow: AgentFlow) => {
    try {
      await agentFlowService.update(flow.id, { is_active: !flow.is_active });
      toast.success(flow.is_active ? 'Flow desativado' : 'Flow ativado');
      loadFlows();
    } catch {
      toast.error('Erro ao atualizar flow');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este flow?')) return;
    try {
      await agentFlowService.delete(id);
      toast.success('Flow excluído');
      loadFlows();
    } catch {
      toast.error('Erro ao excluir flow');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flows de Agente</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Configure fluxos de automação com IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadFlows}>
            <ArrowPathIcon className="h-5 w-5" />
          </Button>
          <Button onClick={openCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Novo Flow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{flows.length}</p>
          <p className="text-sm text-gray-500 dark:text-zinc-400">Total</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{flows.filter(f => f.is_active).length}</p>
          <p className="text-sm text-gray-500 dark:text-zinc-400">Ativos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {flows.reduce((acc, f) => acc + (f.total_executions || 0), 0)}
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400">Execuções</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {flows.filter(f => f.is_default).length > 0
              ? `${Math.round((flows.filter(f => f.is_default)[0]?.success_rate || 0) * 100)}%`
              : '—'}
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400">Taxa de Sucesso</p>
        </Card>
      </div>

      {/* Flows List */}
      {flows.length === 0 ? (
        <Card className="p-12 text-center">
          <CpuChipIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum flow criado</p>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
            Crie flows para automatizar atendimentos com IA
          </p>
          <Button onClick={openCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Criar Primeiro Flow
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map(flow => (
            <Card key={flow.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{flow.name}</h3>
                    {flow.is_default && (
                      <Badge variant="info">Padrão</Badge>
                    )}
                  </div>
                  {flow.description && (
                    <p className="text-sm text-gray-500 dark:text-zinc-400 line-clamp-2">{flow.description}</p>
                  )}
                </div>
                <Badge variant={flow.is_active ? 'success' : 'gray'}>
                  {flow.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                  <PlayIcon className="h-4 w-4" />
                  <span>{flow.total_executions || 0} execuções</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>{Math.round((flow.success_rate || 0) * 100)}% sucesso</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 col-span-2">
                  <ClockIcon className="h-4 w-4" />
                  <span>
                    {format(new Date(flow.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                <Button
                  size="sm"
                  variant={flow.is_active ? 'secondary' : 'primary'}
                  onClick={() => handleToggleActive(flow)}
                  className="flex-1"
                >
                  {flow.is_active
                    ? <><PauseIcon className="h-4 w-4 mr-1" />Desativar</>
                    : <><PlayIcon className="h-4 w-4 mr-1" />Ativar</>
                  }
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(flow)}>
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(flow.id)}>
                  <TrashIcon className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingFlow ? 'Editar Flow' : 'Novo Flow'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Descrição</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Flow JSON
            </label>
            <textarea
              rows={8}
              value={formData.flow_json}
              onChange={e => setFormData(p => ({ ...p, flow_json: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder='{"nodes": [], "edges": []}'
            />
            <p className="text-xs text-gray-400 mt-1">JSON de definição do fluxo</p>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
              />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Ativo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={e => setFormData(p => ({ ...p, is_default: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
              />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Flow padrão</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingFlow ? 'Atualizar' : 'Criar Flow'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AgentFlowsPage;
