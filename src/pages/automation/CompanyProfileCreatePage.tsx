import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { companyProfileApi, businessTypeLabels } from '../../services/automation';
import { BusinessHours, BusinessType } from '../../types';
import { Loading as LoadingSpinner } from '../../components/common/Loading';
import { toast } from 'react-hot-toast';

const daysOfWeek = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const businessTypes = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'retail', label: 'Varejo' },
  { value: 'service', label: 'Serviços' },
  { value: 'healthcare', label: 'Saúde' },
  { value: 'education', label: 'Educação' },
  { value: 'other', label: 'Outro' },
];

const CompanyProfileCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    business_type: 'restaurant',
    description: '',
    website_url: '',
    menu_url: '',
    order_url: '',
    account_phone: '',
    auto_reply_enabled: true,
    welcome_message_enabled: true,
    menu_auto_send: false,
    abandoned_cart_notification: false,
    abandoned_cart_delay_minutes: 30,
    pix_notification_enabled: true,
    payment_confirmation_enabled: true,
    order_status_notification_enabled: true,
    delivery_notification_enabled: true,
    use_langflow: false,
    langflow_flow_id: '',
  });
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { open: true, start: '09:00', end: '18:00' },
    tuesday: { open: true, start: '09:00', end: '18:00' },
    wednesday: { open: true, start: '09:00', end: '18:00' },
    thursday: { open: true, start: '09:00', end: '18:00' },
    friday: { open: true, start: '09:00', end: '18:00' },
    saturday: { open: false, start: '09:00', end: '18:00' },
    sunday: { open: false, start: '09:00', end: '18:00' },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }
    
    if (!formData.account_phone.trim()) {
      toast.error('Telefone da conta é obrigatório');
      return;
    }
    
    try {
      setSaving(true);
      // Get current account ID from auth store or use a default
      const accountId = '24ede983-4d6e-411d-ab2a-8307015edf04'; // Pastita account ID
      const newProfile = await companyProfileApi.create({
        account_id: accountId,
        company_name: formData.company_name,
        business_type: formData.business_type as BusinessType,
        description: formData.description,
        website_url: formData.website_url,
        menu_url: formData.menu_url,
        order_url: formData.order_url,
        business_hours: businessHours,
      });
      toast.success('Perfil criado com sucesso!');
      navigate(`/automation/companies/${newProfile.id}`);
    } catch (error) {
      toast.error('Erro ao criar perfil');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleBusinessHoursChange = (
    day: string,
    field: 'open' | 'start' | 'end',
    value: boolean | string
  ) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof BusinessHours],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/automation/companies"
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-zinc-400"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Perfil de Empresa</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Crie um novo perfil para automação</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-zinc-900 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Nome da Empresa *
              </label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-zinc-700 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-zinc-800 dark:text-white"
                placeholder="Ex: Pastita Massas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Telefone da Conta (WhatsApp) *
              </label>
              <input
                type="text"
                required
                value={formData.account_phone}
                onChange={(e) => setFormData({ ...formData, account_phone: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-zinc-700 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-zinc-800 dark:text-white"
                placeholder="Ex: 5563999999999"
              />
              <p className="mt-1 text-xs text-gray-500">Formato: 55 + DDD + número</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Tipo de Negócio
              </label>
              <select
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-zinc-700 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-zinc-800 dark:text-white"
              >
                {businessTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Descrição
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-zinc-700 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-zinc-800 dark:text-white"
                placeholder="Descrição da empresa..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Website
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-zinc-700 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-zinc-800 dark:text-white"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                URL do Cardápio
              </label>
              <input
                type="url"
                value={formData.menu_url}
                onChange={(e) => setFormData({ ...formData, menu_url: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-zinc-700 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-zinc-800 dark:text-white"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white dark:bg-zinc-900 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Horário de Funcionamento</h2>
          <div className="space-y-4">
            {daysOfWeek.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-4">
                <label className="flex items-center w-32">
                  <input
                    type="checkbox"
                    checked={businessHours[key as keyof BusinessHours]?.open || false}
                    onChange={(e) => handleBusinessHoursChange(key, 'open', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-zinc-300">{label}</span>
                </label>
                {businessHours[key as keyof BusinessHours]?.open && (
                  <>
                    <input
                      type="time"
                      value={businessHours[key as keyof BusinessHours]?.start || '09:00'}
                      onChange={(e) => handleBusinessHoursChange(key, 'start', e.target.value)}
                      className="rounded-md border-gray-300 dark:border-zinc-700 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-zinc-800 dark:text-white"
                    />
                    <span className="text-gray-500">até</span>
                    <input
                      type="time"
                      value={businessHours[key as keyof BusinessHours]?.end || '18:00'}
                      onChange={(e) => handleBusinessHoursChange(key, 'end', e.target.value)}
                      className="rounded-md border-gray-300 dark:border-zinc-700 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-zinc-800 dark:text-white"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Automation Settings */}
        <div className="bg-white dark:bg-zinc-900 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Configurações de Automação</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.auto_reply_enabled}
                onChange={(e) => setFormData({ ...formData, auto_reply_enabled: e.target.checked })}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-zinc-300">Auto-resposta ativada</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.welcome_message_enabled}
                onChange={(e) => setFormData({ ...formData, welcome_message_enabled: e.target.checked })}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-zinc-300">Mensagem de boas-vindas</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.menu_auto_send}
                onChange={(e) => setFormData({ ...formData, menu_auto_send: e.target.checked })}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-zinc-300">Enviar cardápio automaticamente</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.pix_notification_enabled}
                onChange={(e) => setFormData({ ...formData, pix_notification_enabled: e.target.checked })}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-zinc-300">Notificações de PIX</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.payment_confirmation_enabled}
                onChange={(e) => setFormData({ ...formData, payment_confirmation_enabled: e.target.checked })}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-zinc-300">Confirmação de pagamento</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-3">
          <Link
            to="/automation/companies"
            className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                Criar Perfil
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyProfileCreatePage;
