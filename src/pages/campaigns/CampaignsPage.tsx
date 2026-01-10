import React, { useCallback, useEffect, useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Input, Badge, Modal, Loading } from '../../components/common';
import { campaignsService, Campaign, PaginatedResponse } from '../../services/campaigns';
import { getErrorMessage } from '../../services';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray' | 'primary' | 'purple' | 'orange' | 'teal' | 'indigo';

const STATUS_COLORS: Record<string, BadgeVariant> = {
  draft: 'gray',
  scheduled: 'info',
  running: 'success',
  paused: 'warning',
  completed: 'purple',
  cancelled: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  running: 'Em execução',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const TYPE_LABELS: Record<string, string> = {
  broadcast: 'Broadcast',
  drip: 'Drip',
  triggered: 'Gatilho',
  promotional: 'Promocional',
  transactional: 'Transacional',
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

export const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [viewingStats, setViewingStats] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'broadcast' as Campaign['campaign_type'],
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.campaign_type = typeFilter;

      const data = await campaignsService.getCampaigns(params);
      setCampaigns(data.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        description: campaign.description,
        campaign_type: campaign.campaign_type,
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        description: '',
        campaign_type: 'broadcast',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);
      if (editingCampaign) {
        await campaignsService.updateCampaign(editingCampaign.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          campaign_type: formData.campaign_type,
        });
        toast.success('Campanha atualizada!');
      } else {
        // For new campaigns, we need an account_id - this would come from context in real app
        toast.error('Criação de campanhas requer seleção de conta WhatsApp');
        return;
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCampaign) return;
    try {
      setSaving(true);
      await campaignsService.deleteCampaign(deletingCampaign.id);
      setIsDeleteModalOpen(false);
      setDeletingCampaign(null);
      toast.success('Campanha excluída!');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (campaign: Campaign) => {
    try {
      await campaignsService.startCampaign(campaign.id);
      toast.success('Campanha iniciada!');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handlePause = async (campaign: Campaign) => {
    try {
      await campaignsService.pauseCampaign(campaign.id);
      toast.success('Campanha pausada!');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleResume = async (campaign: Campaign) => {
    try {
      await campaignsService.resumeCampaign(campaign.id);
      toast.success('Campanha retomada!');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancel = async (campaign: Campaign) => {
    try {
      await campaignsService.cancelCampaign(campaign.id);
      toast.success('Campanha cancelada!');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleViewStats = (campaign: Campaign) => {
    setViewingStats(campaign);
    setIsStatsModalOpen(true);
  };

  if (loading && campaigns.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-gray-500">Gerencie campanhas de marketing via WhatsApp</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold">{campaigns.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <PlayIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Em Execução</p>
              <p className="text-2xl font-bold">
                {campaigns.filter((c) => c.status === 'running').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Agendadas</p>
              <p className="text-2xl font-bold">
                {campaigns.filter((c) => c.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Concluídas</p>
              <p className="text-2xl font-bold">
                {campaigns.filter((c) => c.status === 'completed').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="scheduled">Agendada</option>
            <option value="running">Em execução</option>
            <option value="paused">Pausada</option>
            <option value="completed">Concluída</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os tipos</option>
            <option value="broadcast">Broadcast</option>
            <option value="drip">Drip</option>
            <option value="triggered">Gatilho</option>
            <option value="promotional">Promocional</option>
            <option value="transactional">Transacional</option>
          </select>
        </div>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campanha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxa de Entrega
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criada em
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma campanha encontrada
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {campaign.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {TYPE_LABELS[campaign.campaign_type] || campaign.campaign_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_COLORS[campaign.status] || 'gray'}>
                        {STATUS_LABELS[campaign.status] || campaign.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{
                              width: `${
                                campaign.total_recipients > 0
                                  ? (campaign.messages_sent / campaign.total_recipients) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {campaign.messages_sent}/{campaign.total_recipients}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {formatPercent(campaign.delivery_rate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(campaign.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewStats(campaign)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Ver estatísticas"
                        >
                          <ChartBarIcon className="w-5 h-5" />
                        </button>
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => handleStart(campaign)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Iniciar"
                          >
                            <PlayIcon className="w-5 h-5" />
                          </button>
                        )}
                        {campaign.status === 'running' && (
                          <button
                            onClick={() => handlePause(campaign)}
                            className="p-1 text-gray-400 hover:text-yellow-600"
                            title="Pausar"
                          >
                            <PauseIcon className="w-5 h-5" />
                          </button>
                        )}
                        {campaign.status === 'paused' && (
                          <>
                            <button
                              onClick={() => handleResume(campaign)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Retomar"
                            >
                              <PlayIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleCancel(campaign)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Cancelar"
                            >
                              <StopIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => handleOpenModal(campaign)}
                            className="p-1 text-gray-400 hover:text-primary-600"
                            title="Editar"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                        )}
                        {['draft', 'cancelled'].includes(campaign.status) && (
                          <button
                            onClick={() => {
                              setDeletingCampaign(campaign);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Excluir"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}>
        <div className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome da campanha"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição da campanha"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={formData.campaign_type}
              onChange={(e) =>
                setFormData({ ...formData, campaign_type: e.target.value as Campaign['campaign_type'] })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="broadcast">Broadcast</option>
              <option value="drip">Drip</option>
              <option value="triggered">Gatilho</option>
              <option value="promotional">Promocional</option>
              <option value="transactional">Transacional</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingCampaign ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Campanha"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Tem certeza que deseja excluir a campanha <strong>{deletingCampaign?.name}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stats Modal */}
      <Modal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        title={`Estatísticas: ${viewingStats?.name}`}
      >
        {viewingStats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total de Destinatários</p>
                <p className="text-2xl font-bold">{viewingStats.total_recipients}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Mensagens Enviadas</p>
                <p className="text-2xl font-bold">{viewingStats.messages_sent}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Entregues</p>
                <p className="text-2xl font-bold text-green-600">{viewingStats.messages_delivered}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500">Lidas</p>
                <p className="text-2xl font-bold text-blue-600">{viewingStats.messages_read}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500">Falhas</p>
                <p className="text-2xl font-bold text-red-600">{viewingStats.messages_failed}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-500">Taxa de Entrega</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercent(viewingStats.delivery_rate)}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setIsStatsModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CampaignsPage;
