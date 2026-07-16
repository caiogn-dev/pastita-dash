import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  CpuChipIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { companyProfileService, businessTypeLabels } from '../../services/automation';
import * as whatsappService from '../../services/whatsapp';
import { getStores, type Store as StoreRecord } from '../../services/storesApi';
import {
  CompanyProfile,
  CreateCompanyProfile,
  UpdateCompanyProfile,
  BusinessHours,
  WhatsAppAccount,
} from '../../types';
import { Loading as LoadingSpinner } from '../../components/common/Loading';
import { Input, Switch, Textarea } from '../../components/common';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../hooks/useConfirm';

const daysOfWeek = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const CompanyProfileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreateMode = !id;

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [ConfirmDialog, confirmAction] = useConfirm();
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateCompanyProfile>({});
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [showApiKey, setShowApiKey] = useState(false);
  // ── Bot de Pedidos (settings JSON livre no backend) ──
  // Editados aqui: bot_order_enabled, bot_upsell_categories, allowed_intents.
  // Qualquer outra chave (ex.: bot_cta) é PRESERVADA no merge do submit.
  const [botOrderEnabled, setBotOrderEnabled] = useState(true);
  const [upsellCategoriesText, setUpsellCategoriesText] = useState('');
  const [allowedIntentsText, setAllowedIntentsText] = useState('');
  const [createLinks, setCreateLinks] = useState({
    store_id: '',
    account_id: '',
  });

  useEffect(() => {
    void loadInitialData();
  }, [id]);

  const hydrateForm = (data: CompanyProfile) => {
    setProfile(data);
    setFormData({
      company_name: data.company_name || data.store_name || '',
      business_type: data.business_type || '',
      description: data.description || '',
      website_url: data.website_url || '',
      menu_url: data.menu_url || '',
      order_url: data.order_url || '',
      auto_reply_enabled: data.auto_reply_enabled ?? false,
      welcome_message_enabled: data.welcome_message_enabled ?? false,
      menu_auto_send: data.menu_auto_send ?? false,
      abandoned_cart_notification: data.abandoned_cart_notification ?? false,
      abandoned_cart_delay_minutes: data.abandoned_cart_delay_minutes || 30,
      pix_notification_enabled: data.pix_notification_enabled ?? false,
      payment_confirmation_enabled: data.payment_confirmation_enabled ?? false,
      order_status_notification_enabled: data.order_status_notification_enabled ?? false,
      delivery_notification_enabled: data.delivery_notification_enabled ?? false,
      use_ai_agent: data.use_ai_agent ?? false,
      default_agent: data.default_agent || null,
    });
    setBusinessHours(data.business_hours || {});

    const settings = data.settings || {};
    // Default ON quando a chave está ausente (comportamento do bot).
    setBotOrderEnabled(settings.bot_order_enabled !== false);
    const upsell = Array.isArray(settings.bot_upsell_categories)
      ? (settings.bot_upsell_categories as unknown[]).filter((c): c is string => typeof c === 'string')
      : [];
    setUpsellCategoriesText(upsell.join(', '));
    setAllowedIntentsText(
      Array.isArray(settings.allowed_intents)
        ? JSON.stringify(settings.allowed_intents)
        : ''
    );
  };

  /**
   * Mescla os campos do bot sobre as settings EXISTENTES do perfil.
   * Retorna null se o JSON de intents for inválido (bloqueia o submit).
   * Vazio em upsell/intents = remove a chave (volta ao default do bot).
   */
  const buildMergedSettings = (): Record<string, unknown> | null => {
    const merged: Record<string, unknown> = { ...(profile?.settings || {}) };

    merged.bot_order_enabled = botOrderEnabled;

    const categories = upsellCategoriesText
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (categories.length > 0) {
      merged.bot_upsell_categories = categories;
    } else {
      delete merged.bot_upsell_categories;
    }

    const rawIntents = allowedIntentsText.trim();
    if (!rawIntents) {
      delete merged.allowed_intents;
    } else {
      try {
        const parsed: unknown = JSON.parse(rawIntents);
        if (!Array.isArray(parsed) || !parsed.every((i) => typeof i === 'string')) {
          throw new Error('not a string array');
        }
        merged.allowed_intents = parsed;
      } catch {
        toast.error('Intents permitidos: JSON inválido — esperado um array de strings, ex.: ["greeting", "order"]');
        return null;
      }
    }

    return merged;
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [storesResponse, accountsResponse, profileResponse] = await Promise.all([
        getStores(),
        whatsappService.getAccounts(),
        isCreateMode ? Promise.resolve(null) : companyProfileService.get(id!),
      ]);

      const availableStores = storesResponse.results || [];
      const availableAccounts = (accountsResponse as any)?.data?.results || [];

      setStores(availableStores);
      setAccounts(availableAccounts);

      if (isCreateMode) {
        setCreateLinks({
          store_id: availableStores.length === 1 ? availableStores[0].id : '',
          account_id: availableAccounts.length === 1 ? availableAccounts[0].id : '',
        });
        setFormData({
          company_name: '',
          business_type: '',
          description: '',
          website_url: '',
          menu_url: '',
          order_url: '',
          auto_reply_enabled: true,
          welcome_message_enabled: true,
          menu_auto_send: true,
          abandoned_cart_notification: true,
          abandoned_cart_delay_minutes: 30,
          pix_notification_enabled: true,
          payment_confirmation_enabled: true,
          order_status_notification_enabled: true,
          delivery_notification_enabled: true,
          use_ai_agent: false,
          default_agent: null,
        });
        setBusinessHours({});
      } else if (profileResponse) {
        hydrateForm(profileResponse);
      }
    } catch (error) {
      toast.error(isCreateMode ? 'Erro ao carregar dados para criação' : 'Erro ao carregar perfil');
      navigate('/automation/companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Valida/mescla settings do bot ANTES de qualquer request.
    const mergedSettings = buildMergedSettings();
    if (mergedSettings === null) return;

    try {
      setSaving(true);

      if (isCreateMode) {
        if (!createLinks.store_id || !createLinks.account_id) {
          toast.error('Selecione a loja e a conta WhatsApp antes de continuar');
          return;
        }

        const createPayload: CreateCompanyProfile = {
          account_id: createLinks.account_id,
          store_id: createLinks.store_id,
          name: formData.company_name || 'Perfil de automação',
          company_name: formData.company_name,
          description: formData.description,
          business_hours: businessHours,
        };

        const created = await companyProfileService.create(createPayload);
        await companyProfileService.update(created.id, {
          ...formData,
          business_hours: businessHours,
          settings: mergedSettings,
        });

        toast.success('Perfil criado com sucesso!');
        navigate(`/automation/companies/${created.id}`);
        return;
      }

      await companyProfileService.update(id!, {
        ...formData,
        business_hours: businessHours,
        settings: mergedSettings,
      });
      toast.success('Perfil atualizado com sucesso!');
      await loadInitialData();
    } catch (error) {
      toast.error(isCreateMode ? 'Erro ao criar perfil' : 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = await confirmAction({
      title: 'Excluir perfil',
      message: 'Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await companyProfileService.delete(id);
      toast.success('Perfil excluído com sucesso');
      navigate('/automation/companies');
    } catch (error) {
      toast.error('Erro ao excluir perfil');
    }
  };

  const handleCopyApiKey = () => {
    if (profile?.external_api_key) {
      navigator.clipboard.writeText(profile.external_api_key);
      toast.success('API key copiada!');
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!id) return;
    const confirmed = await confirmAction({
      title: 'Regenerar API key',
      message: 'Tem certeza? A chave atual será invalidada.',
      confirmText: 'Regenerar',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      const result = await companyProfileService.regenerateApiKey(id);
      toast.success('Nova API key gerada!');
      navigator.clipboard.writeText(result.api_key);
      await loadInitialData();
    } catch (error) {
      toast.error('Erro ao gerar nova API key');
    }
  };

  const handleBusinessHoursChange = (
    day: string,
    field: 'open' | 'start' | 'end',
    value: boolean | string
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day as keyof BusinessHours],
        [field]: value,
      },
    }));
  };

  const selectedStore = stores.find((store) => store.id === createLinks.store_id);
  const selectedAccount = accounts.find((account) => account.id === createLinks.account_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isCreateMode && !profile) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/automation/companies"
            className="p-2 text-fg-muted-token hover:text-fg-token transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-fg-token">
              {isCreateMode ? 'Novo Perfil de Automação' : profile?.company_name}
            </h1>
            <p className="text-sm text-fg-muted-token">
              {isCreateMode
                ? 'Vincule uma loja e uma conta WhatsApp para centralizar automações'
                : profile?.account_phone}
            </p>
          </div>
        </div>
        {!isCreateMode && id && (
          <div className="flex space-x-2">
            <Link
              to={`/automation/companies/${id}/messages`}
              className="inline-flex items-center px-4 py-2 border border-border-token rounded-md shadow-sm text-sm font-medium text-fg-token bg-surface hover:bg-surface-2 transition-colors"
            >
              Mensagens Automáticas
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-[var(--danger)] rounded-md shadow-sm text-sm font-medium text-[var(--danger)] bg-surface hover:bg-[var(--danger-soft)] transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Excluir
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {isCreateMode && (
          <div className="bg-surface border border-border-token shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-fg-token mb-4">Vínculos obrigatórios</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-fg-token">
                  Loja
                </label>
                <select
                  value={createLinks.store_id}
                  onChange={(e) => setCreateLinks((prev) => ({ ...prev, store_id: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
                >
                  <option value="">Selecione uma loja</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-fg-muted-token">
                  A loja deve ser a fonte principal dos dados de negócio.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-token">
                  Conta WhatsApp
                </label>
                <select
                  value={createLinks.account_id}
                  onChange={(e) => setCreateLinks((prev) => ({ ...prev, account_id: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
                >
                  <option value="">Selecione uma conta</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.phone_number})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-fg-muted-token">
                  Essa conta será usada nas mensagens automáticas e sessões.
                </p>
              </div>
            </div>
            {(selectedStore || selectedAccount) && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border-token bg-surface-2 p-4 text-sm text-fg-token">
                  <p className="font-medium text-fg-token">Loja selecionada</p>
                  <p>{selectedStore?.name || 'Nenhuma loja selecionada'}</p>
                  <p className="text-xs text-fg-muted-token">{selectedStore?.slug || ''}</p>
                </div>
                <div className="rounded-lg border border-border-token bg-surface-2 p-4 text-sm text-fg-token">
                  <p className="font-medium text-fg-token">Conta selecionada</p>
                  <p>{selectedAccount?.name || 'Nenhuma conta selecionada'}</p>
                  <p className="text-xs text-fg-muted-token">{selectedAccount?.phone_number || 'Sem telefone'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-surface border border-border-token shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-fg-token mb-4">Informações Básicas</h2>
          {!isCreateMode && profile?.store_name && (
            <div className="mb-4 rounded-lg border border-border-token bg-surface-2 p-4 text-sm text-fg-token">
              <p className="font-medium text-fg-token">Fonte principal do negócio</p>
              <p>{profile.store_name}</p>
              <p className="text-xs text-fg-muted-token">{profile.store_slug || 'Nenhuma loja vinculada'}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-fg-token">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={formData.company_name || ''}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token">
                Tipo de Negócio
              </label>
              <select
                value={formData.business_type || ''}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value as UpdateCompanyProfile['business_type'] })}
                className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
              >
                <option value="">Selecione</option>
                {Object.entries(businessTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-fg-token">
                Descrição
              </label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token">
                URL do Site
              </label>
              <input
                type="url"
                value={formData.website_url || ''}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token">
                URL do Cardápio/Catálogo
              </label>
              <input
                type="url"
                value={formData.menu_url || ''}
                onChange={(e) => setFormData({ ...formData, menu_url: e.target.value })}
                className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token">
                URL para Pedidos
              </label>
              <input
                type="url"
                value={formData.order_url || ''}
                onChange={(e) => setFormData({ ...formData, order_url: e.target.value })}
                className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border-token shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-fg-token mb-4">Configurações de Automação</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-fg-token">Respostas Automáticas</label>
                <p className="text-sm text-fg-muted-token">Habilitar respostas automáticas para mensagens</p>
              </div>
              <input
                type="checkbox"
                checked={formData.auto_reply_enabled || false}
                onChange={(e) => setFormData({ ...formData, auto_reply_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-fg-token">Mensagem de Boas-vindas</label>
                <p className="text-sm text-fg-muted-token">Enviar boas-vindas na primeira mensagem</p>
              </div>
              <input
                type="checkbox"
                checked={formData.welcome_message_enabled || false}
                onChange={(e) => setFormData({ ...formData, welcome_message_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-fg-token">Enviar Cardápio Automaticamente</label>
                <p className="text-sm text-fg-muted-token">Enviar cardápio junto com boas-vindas</p>
              </div>
              <input
                type="checkbox"
                checked={formData.menu_auto_send || false}
                onChange={(e) => setFormData({ ...formData, menu_auto_send: e.target.checked })}
                className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border-token shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-fg-token mb-4">Notificações</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-fg-token">Carrinho Abandonado</label>
                <p className="text-sm text-fg-muted-token">Notificar quando cliente abandona carrinho</p>
              </div>
              <input
                type="checkbox"
                checked={formData.abandoned_cart_notification || false}
                onChange={(e) => setFormData({ ...formData, abandoned_cart_notification: e.target.checked })}
                className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
              />
            </div>
            {formData.abandoned_cart_notification && (
              <div className="ml-4">
                <label className="block text-sm font-medium text-fg-token">
                  Tempo de espera (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.abandoned_cart_delay_minutes || 30}
                  onChange={(e) => setFormData({ ...formData, abandoned_cart_delay_minutes: parseInt(e.target.value, 10) || 30 })}
                  className="mt-1 block w-32 rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-fg-token">PIX Gerado</label>
                <p className="text-sm text-fg-muted-token">Notificar quando PIX é gerado</p>
              </div>
              <input
                type="checkbox"
                checked={formData.pix_notification_enabled || false}
                onChange={(e) => setFormData({ ...formData, pix_notification_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-fg-token">Confirmação de Pagamento</label>
                <p className="text-sm text-fg-muted-token">Notificar quando pagamento é confirmado</p>
              </div>
              <input
                type="checkbox"
                checked={formData.payment_confirmation_enabled || false}
                onChange={(e) => setFormData({ ...formData, payment_confirmation_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-fg-token">Status do Pedido</label>
                <p className="text-sm text-fg-muted-token">Notificar mudanças no status do pedido</p>
              </div>
              <input
                type="checkbox"
                checked={formData.order_status_notification_enabled || false}
                onChange={(e) => setFormData({ ...formData, order_status_notification_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-fg-token">Entrega</label>
                <p className="text-sm text-fg-muted-token">Notificar sobre entrega</p>
              </div>
              <input
                type="checkbox"
                checked={formData.delivery_notification_enabled || false}
                onChange={(e) => setFormData({ ...formData, delivery_notification_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border-token shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-fg-token mb-4">Horário de Funcionamento</h2>
          <div className="space-y-3">
            {daysOfWeek.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-4">
                <div className="w-32">
                  <label className="text-sm font-medium text-fg-token">{label}</label>
                </div>
                <input
                  type="checkbox"
                  checked={businessHours[key as keyof BusinessHours]?.open || false}
                  onChange={(e) => handleBusinessHoursChange(key, 'open', e.target.checked)}
                  className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
                />
                {businessHours[key as keyof BusinessHours]?.open && (
                  <>
                    <input
                      type="time"
                      value={businessHours[key as keyof BusinessHours]?.start || '08:00'}
                      onChange={(e) => handleBusinessHoursChange(key, 'start', e.target.value)}
                      className="rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
                    />
                    <span className="text-fg-muted-token">até</span>
                    <input
                      type="time"
                      value={businessHours[key as keyof BusinessHours]?.end || '18:00'}
                      onChange={(e) => handleBusinessHoursChange(key, 'end', e.target.value)}
                      className="rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {!isCreateMode && (
          <div className="bg-surface border border-border-token shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-fg-token mb-4">Integração API</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-token">API Key</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    readOnly
                    value={
                      profile?.external_api_key
                        ? (showApiKey ? profile.external_api_key : '••••••••••••••••••••••••••••••••')
                        : 'Não gerada'
                    }
                    className="flex-1 block w-full rounded-l-md border-border-token bg-surface-2 text-fg-muted-token"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    title={showApiKey ? 'Ocultar API key' : 'Revelar API key'}
                    className="inline-flex items-center px-3 border border-l-0 border-border-token bg-surface-2 text-fg-muted-token hover:text-fg-token transition-colors"
                  >
                    {showApiKey ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyApiKey}
                    className="inline-flex items-center px-3 border border-l-0 border-border-token bg-surface-2 text-fg-muted-token hover:text-fg-token transition-colors"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateApiKey}
                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-border-token bg-surface-2 text-fg-muted-token hover:text-fg-token transition-colors"
                  >
                    <KeyIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-fg-muted-token">
                  Use esta chave no header X-API-Key para autenticar webhooks
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-token">Webhook Secret</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    readOnly
                    value={profile?.webhook_secret ? '••••••••••••••••' : 'Não gerado'}
                    className="flex-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-muted-token"
                  />
                </div>
                <p className="mt-1 text-sm text-fg-muted-token">
                  Use para validar assinaturas de webhook (opcional)
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-surface border border-border-token shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-fg-token mb-4">Integração Agente IA</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-fg-token">Usar Agente IA</label>
                <p className="text-sm text-fg-muted-token">Usar Agente IA (Langchain) para respostas avançadas</p>
              </div>
              <input
                type="checkbox"
                checked={formData.use_ai_agent || false}
                onChange={(e) => setFormData({ ...formData, use_ai_agent: e.target.checked })}
                className="h-4 w-4 rounded border-border-token text-brand focus:ring-brand"
              />
            </div>
            {formData.use_ai_agent && (
              <div>
                <label className="block text-sm font-medium text-fg-token">
                  ID do Agente
                </label>
                <input
                  type="text"
                  value={formData.default_agent || ''}
                  onChange={(e) => setFormData({ ...formData, default_agent: e.target.value || null })}
                  placeholder="UUID do Agente IA"
                  className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
                />
                <p className="mt-1 text-sm text-fg-muted-token">
                  <Link to="/agents" className="text-brand hover:underline">Gerenciar Agentes IA →</Link>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface border border-border-token shadow rounded-lg p-6">
          <h2 className="flex items-center gap-2 text-lg font-medium text-fg-token mb-4">
            <CpuChipIcon className="h-5 w-5 text-brand" aria-hidden="true" />
            Bot de Pedidos (WhatsApp)
          </h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label id="bot-order-enabled-label" className="text-sm font-medium text-fg-token">
                  Aceitar pedidos pelo bot
                </label>
                <p className="text-sm text-fg-muted-token">
                  Quando desligado, o bot responde dúvidas mas não monta carrinho nem fecha pedidos
                </p>
              </div>
              <Switch checked={botOrderEnabled} onChange={setBotOrderEnabled} />
            </div>

            <div>
              <label htmlFor="bot-upsell-categories" className="block text-sm font-medium text-fg-token mb-1">
                Categorias de upsell (separadas por vírgula)
              </label>
              <Input
                id="bot-upsell-categories"
                type="text"
                value={upsellCategoriesText}
                onChange={(e) => setUpsellCategoriesText(e.target.value)}
                placeholder="Ex.: Bebidas, Sobremesas"
              />
              <p className="mt-1 text-sm text-fg-muted-token">
                Nomes de categorias do cardápio usadas nas sugestões do bot. Vazio = seleção automática.
              </p>
            </div>

            <div>
              <label htmlFor="bot-allowed-intents" className="block text-sm font-medium text-fg-token mb-1">
                Intents permitidos (JSON, avançado)
              </label>
              <Textarea
                id="bot-allowed-intents"
                rows={2}
                value={allowedIntentsText}
                onChange={(e) => setAllowedIntentsText(e.target.value)}
                placeholder='Ex.: ["greeting", "order", "menu"]'
                spellCheck={false}
                className="font-mono text-xs"
              />
              <p className="mt-1 text-sm text-fg-muted-token">
                Modo restrito: array JSON de intents que o bot pode atender. Vazio = todos os intents.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            to="/automation/companies"
            className="px-4 py-2 border border-border-token rounded-md shadow-sm text-sm font-medium text-fg-token bg-surface hover:bg-surface-2 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-hover disabled:opacity-50 transition-colors"
          >
            {saving ? <LoadingSpinner size="sm" /> : isCreateMode ? 'Criar Perfil' : 'Salvar'}
          </button>
        </div>
      </form>
      {ConfirmDialog}
    </div>
  );
};

export default CompanyProfileDetailPage;
