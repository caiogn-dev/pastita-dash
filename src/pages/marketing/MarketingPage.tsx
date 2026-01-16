/**
 * Marketing Hub Page
 * 
 * Central hub for all marketing activities:
 * - Email campaigns
 * - WhatsApp campaigns
 * - Templates management
 * - Analytics
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  MegaphoneIcon,
  PlusIcon,
  ClockIcon,
  EyeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Modal, Loading } from '../../components/common';
import { useStore } from '../../hooks';
import {
  marketingService,
  EmailTemplate,
  MarketingStats,
} from '../../services/marketingService';
import logger from '../../services/logger';

// =============================================================================
// STATS CARD COMPONENT
// =============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <Card className="p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <ArrowTrendingUpIcon className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}% vs mês anterior</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('600', '100')}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  </Card>
);

// =============================================================================
// TEMPLATE CARD COMPONENT
// =============================================================================

interface TemplateCardProps {
  template: EmailTemplate;
  onPreview: () => void;
  onUse: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onPreview, onUse }) => {
  const typeColors: Record<string, string> = {
    coupon: 'bg-green-100 text-green-700',
    welcome: 'bg-blue-100 text-blue-700',
    promotional: 'bg-orange-100 text-orange-700',
    order_confirmation: 'bg-purple-100 text-purple-700',
    abandoned_cart: 'bg-yellow-100 text-yellow-700',
    newsletter: 'bg-pink-100 text-pink-700',
    transactional: 'bg-gray-100 text-gray-700',
    custom: 'bg-gray-100 text-gray-700',
  };

  const typeLabels: Record<string, string> = {
    coupon: '🎁 Cupom',
    welcome: '👋 Boas-vindas',
    promotional: '🔥 Promoção',
    order_confirmation: '✅ Confirmação',
    abandoned_cart: '🛒 Carrinho',
    newsletter: '📰 Newsletter',
    transactional: '📧 Transacional',
    custom: '✏️ Personalizado',
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      {/* Preview Area */}
      <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        <div 
          className="absolute inset-0 scale-[0.3] origin-top-left pointer-events-none"
          dangerouslySetInnerHTML={{ __html: template.html_content.slice(0, 2000) }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onPreview}
            className="p-2 bg-white rounded-full hover:bg-gray-100"
            title="Visualizar"
          >
            <EyeIcon className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={onUse}
            className="p-2 bg-primary-500 rounded-full hover:bg-primary-600"
            title="Usar Template"
          >
            <PaperAirplaneIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[template.template_type]}`}>
            {typeLabels[template.template_type]}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-1">{template.subject}</p>
        
        {/* Variables */}
        {template.variables.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {template.variables.slice(0, 3).map((v) => (
              <span key={v} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {`{{${v}}}`}
              </span>
            ))}
            {template.variables.length > 3 && (
              <span className="text-xs text-gray-400">+{template.variables.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// =============================================================================
// QUICK ACTION CARD
// =============================================================================

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, description, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left w-full"
  >
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </button>
);

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export const MarketingPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, storeName } = useStore();
  
  const storeId = routeStoreId || contextStoreId;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const loadData = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [statsData, templatesData] = await Promise.all([
        marketingService.stats.get(storeId),
        marketingService.emailTemplates.list(storeId),
      ]);
      setStats(statsData);
      setTemplates(templatesData);
    } catch (error) {
      logger.error('Error loading marketing data:', error);
      toast.error('Erro ao carregar dados de marketing');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUseTemplate = (template: EmailTemplate) => {
    navigate(`/marketing/email/new?template=${template.slug}`);
  };

  if (!storeId) {
    return (
      <div className="p-6 text-center">
        <MegaphoneIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma loja selecionada</h2>
        <p className="text-gray-500 mb-4">Selecione uma loja para acessar o marketing.</p>
        <Button onClick={() => navigate('/stores')}>Ver Lojas</Button>
      </div>
    );
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-gray-500">
            {storeName ? `Campanhas e promoções de ${storeName}` : 'Gerencie suas campanhas de marketing'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/marketing/subscribers')}>
            <UserGroupIcon className="w-5 h-5 mr-2" />
            Contatos
          </Button>
          <Button onClick={() => navigate('/marketing/email/new')}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Emails Enviados"
            value={stats.email.total_sent.toLocaleString()}
            subtitle={`${stats.email.open_rate.toFixed(1)}% taxa de abertura`}
            icon={EnvelopeIcon}
            color="text-blue-600"
          />
          <StatCard
            title="WhatsApp Enviados"
            value={stats.whatsapp.total_sent.toLocaleString()}
            subtitle={`${stats.whatsapp.read_rate.toFixed(1)}% taxa de leitura`}
            icon={DevicePhoneMobileIcon}
            color="text-green-600"
          />
          <StatCard
            title="Campanhas Ativas"
            value={stats.email.total_campaigns + stats.whatsapp.total_campaigns}
            subtitle="Email + WhatsApp"
            icon={MegaphoneIcon}
            color="text-purple-600"
          />
          <StatCard
            title="Inscritos"
            value={stats.subscribers.total.toLocaleString()}
            subtitle={`+${stats.subscribers.new_this_month} este mês`}
            icon={UserGroupIcon}
            color="text-orange-600"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="Enviar Cupom"
            description="Crie e envie cupons de desconto"
            icon={SparklesIcon}
            color="bg-gradient-to-br from-green-500 to-emerald-600"
            onClick={() => navigate('/marketing/email/new?template=coupon')}
          />
          <QuickAction
            title="Promoção Relâmpago"
            description="Anuncie ofertas por tempo limitado"
            icon={MegaphoneIcon}
            color="bg-gradient-to-br from-orange-500 to-red-500"
            onClick={() => navigate('/marketing/email/new?template=promotion')}
          />
          <QuickAction
            title="Recuperar Carrinhos"
            description="Reengaje clientes que abandonaram"
            icon={ClockIcon}
            color="bg-gradient-to-br from-yellow-500 to-amber-600"
            onClick={() => navigate('/marketing/email/new?template=abandoned_cart')}
          />
          <QuickAction
            title="WhatsApp em Massa"
            description="Envie mensagens para sua base"
            icon={DevicePhoneMobileIcon}
            color="bg-gradient-to-br from-green-600 to-teal-600"
            onClick={() => navigate('/marketing/whatsapp/new')}
          />
        </div>
      </div>

      {/* Email Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Templates de Email</h2>
          <Button variant="secondary" size="sm" onClick={() => navigate('/marketing/email/templates')}>
            Ver Todos
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.slice(0, 4).map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={() => setPreviewTemplate(template)}
              onUse={() => handleUseTemplate(template)}
            />
          ))}
        </div>
      </div>

      {/* Recent Campaigns */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Campanhas Recentes</h2>
          <Button variant="secondary" size="sm" onClick={() => navigate('/marketing/email')}>
            Ver Todas ({stats?.campaigns?.total || 0})
          </Button>
        </div>
        {stats?.campaigns?.total && stats.campaigns.total > 0 ? (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.campaigns.total}</p>
                <p className="text-sm text-gray-500">campanhas criadas</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-green-600">{stats.emails?.sent || 0}</p>
                <p className="text-sm text-gray-500">emails enviados</p>
              </div>
              <Button onClick={() => navigate('/marketing/email')}>
                Ver Campanhas
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <MegaphoneIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Nenhuma campanha criada ainda</p>
            <Button onClick={() => navigate('/marketing/email/new')}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Criar Primeira Campanha
            </Button>
          </Card>
        )}
      </div>

      {/* Template Preview Modal */}
      <Modal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name || 'Preview'}
        size="xl"
      >
        {previewTemplate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Assunto:</p>
                <p className="font-medium">{previewTemplate.subject}</p>
              </div>
              <Button onClick={() => {
                handleUseTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}>
                Usar Template
              </Button>
            </div>
            <div 
              className="border rounded-lg overflow-hidden"
              style={{ height: '500px' }}
            >
              <iframe
                srcDoc={previewTemplate.html_content}
                className="w-full h-full"
                title="Email Preview"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MarketingPage;
