import React, { useEffect, useState } from 'react';
import logger from '../../services/logger';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Input, Select, PageLoading, PageTitle } from '../../components/common';
import { whatsappService, agentsService, getErrorMessage } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { Agent } from '../../services/agents';

export const AccountFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateAccount } = useAccountStore();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone_number_id: '',
    waba_id: '',
    phone_number: '',
    display_phone_number: '',
    access_token: '',
    webhook_verify_token: '',
    auto_response_enabled: true,
    human_handoff_enabled: true,
    default_agent: '',
  });

  useEffect(() => {
    loadAgents();
    if (isEditing) {
      loadAccount();
    }
  }, [id]);

  const loadAgents = async () => {
    try {
      const agents = await agentsService.getAgents();
      setAgents(agents.filter((a: Agent) => a.status === 'active'));
    } catch (error) {
      logger.error('Error loading agents:', error);
    }
  };

  const loadAccount = async () => {
    setIsLoading(true);
    try {
      const account = await whatsappService.getAccount(id!);
      setFormData({
        name: account.name,
        phone_number_id: account.phone_number_id ?? '',
        waba_id: account.waba_id ?? '',
        phone_number: account.phone_number,
        display_phone_number: account.display_phone_number ?? '',
        access_token: '',
        webhook_verify_token: '',
        auto_response_enabled: account.auto_response_enabled ?? true,
        human_handoff_enabled: account.human_handoff_enabled ?? true,
        default_agent: account.default_agent ?? '',
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isEditing) {
        const updatedAccount = await whatsappService.updateAccount(id!, formData);
        updateAccount(updatedAccount);
        toast.success('Conta atualizada com sucesso!');
      } else {
        const newAccount = await whatsappService.createAccount(formData);
        updateAccount(newAccount);
        toast.success('Conta criada com sucesso!');
      }
      navigate('/accounts');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle
          title={isEditing ? 'Editar Conta' : 'Nova Conta'}
        />
        <Link
          to="/accounts"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome da Conta"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Pastita Principal"
              required
            />

            <Input
              label="Número de Telefone"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="Ex: +55 63 99138-6719"
              required
            />

            <Input
              label="Phone Number ID (Meta)"
              value={formData.phone_number_id}
              onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
              placeholder="Ex: 123456789012345"
              required
            />

            <Input
              label="WABA ID"
              value={formData.waba_id}
              onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })}
              placeholder="Ex: 987654321098765"
            />

            <Input
              label="Número de Exibição"
              value={formData.display_phone_number}
              onChange={(e) => setFormData({ ...formData, display_phone_number: e.target.value })}
              placeholder="Ex: +55 63 99138-6719"
            />

            {!isEditing && (
              <>
                <Input
                  label="Access Token"
                  type="password"
                  value={formData.access_token}
                  onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                  placeholder="Token de acesso da API do WhatsApp"
                  required={!isEditing}
                />

                <Input
                  label="Webhook Verify Token"
                  type="password"
                  value={formData.webhook_verify_token}
                  onChange={(e) => setFormData({ ...formData, webhook_verify_token: e.target.value })}
                  placeholder="Token para verificação do webhook"
                />
              </>
            )}

            <Select
              label="Agente Padrão"
              value={formData.default_agent}
              onChange={(e) => setFormData({ ...formData, default_agent: e.target.value })}
              options={[
                { value: '', label: 'Nenhum' },
                ...agents.map((agent) => ({
                  value: agent.id,
                  label: agent.name,
                })),
              ]}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.auto_response_enabled}
                onChange={(e) => setFormData({ ...formData, auto_response_enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Resposta automática ativada</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.human_handoff_enabled}
                onChange={(e) => setFormData({ ...formData, human_handoff_enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Transferência para humano ativada</span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/accounts')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={isSaving}
            >
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
