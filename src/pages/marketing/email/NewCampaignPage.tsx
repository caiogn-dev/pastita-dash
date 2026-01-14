/**
 * New Email Campaign Page
 * 
 * Create and send email marketing campaigns.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  ClockIcon,
  EyeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Loading } from '../../../components/common';
import { useStore } from '../../../hooks';
import {
  marketingService,
  EmailTemplate,
  EmailCampaignInput,
  EMAIL_TEMPLATE_PRESETS,
} from '../../../services/marketingService';
import logger from '../../../services/logger';

type Step = 'template' | 'content' | 'audience' | 'review';

interface CampaignData {
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  html_content: string;
  audience_type: 'all' | 'custom';
  recipient_list: { email: string; name: string }[];
  variables: Record<string, string>;
}

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'template', label: 'Template', icon: SparklesIcon },
  { id: 'content', label: 'Conteúdo', icon: EnvelopeIcon },
  { id: 'audience', label: 'Audiência', icon: UserGroupIcon },
  { id: 'review', label: 'Revisar', icon: EyeIcon },
];

export const NewCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storeId, storeName } = useStore();

  const [currentStep, setCurrentStep] = useState<Step>('template');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    subject: '',
    from_name: storeName || 'Pastita',
    from_email: '',
    reply_to: '',
    html_content: '',
    audience_type: 'custom',
    recipient_list: [],
    variables: {},
  });

  const [recipientInput, setRecipientInput] = useState({ email: '', name: '' });

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      if (!storeId) return;
      setLoading(true);
      try {
        const data = await marketingService.emailTemplates.list(storeId);
        setTemplates(data);

        // Check if template is specified in URL
        const templateSlug = searchParams.get('template');
        if (templateSlug) {
          const preset = data.find(t => t.slug === templateSlug);
          if (preset) {
            handleSelectTemplate(preset);
          }
        }
      } catch (error) {
        logger.error('Failed to load templates', error);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, [storeId, searchParams]);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setCampaignData(prev => ({
      ...prev,
      name: `Campanha - ${template.name}`,
      subject: template.subject,
      html_content: template.html_content,
      variables: template.variables.reduce((acc, v) => ({ ...acc, [v]: '' }), {}),
    }));
    setCurrentStep('content');
  };

  const handleAddRecipient = () => {
    if (!recipientInput.email) {
      toast.error('Email é obrigatório');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientInput.email)) {
      toast.error('Email inválido');
      return;
    }
    if (campaignData.recipient_list.some(r => r.email === recipientInput.email)) {
      toast.error('Email já adicionado');
      return;
    }

    setCampaignData(prev => ({
      ...prev,
      recipient_list: [...prev.recipient_list, { ...recipientInput }],
    }));
    setRecipientInput({ email: '', name: '' });
  };

  const handleRemoveRecipient = (email: string) => {
    setCampaignData(prev => ({
      ...prev,
      recipient_list: prev.recipient_list.filter(r => r.email !== email),
    }));
  };

  const handleVariableChange = (key: string, value: string) => {
    setCampaignData(prev => ({
      ...prev,
      variables: { ...prev.variables, [key]: value },
    }));
  };

  const getPreviewHtml = useCallback(() => {
    let html = campaignData.html_content;
    Object.entries(campaignData.variables).forEach(([key, value]) => {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    });
    // Replace store variables
    html = html.replace(/\{\{store_name\}\}/g, storeName || 'Loja');
    html = html.replace(/\{\{year\}\}/g, new Date().getFullYear().toString());
    return html;
  }, [campaignData.html_content, campaignData.variables, storeName]);

  const handleSendCampaign = async () => {
    if (!storeId) {
      toast.error('Selecione uma loja');
      return;
    }

    if (campaignData.recipient_list.length === 0) {
      toast.error('Adicione pelo menos um destinatário');
      return;
    }

    if (!campaignData.subject) {
      toast.error('Assunto é obrigatório');
      return;
    }

    setSending(true);
    try {
      // Create campaign
      const campaign = await marketingService.emailCampaigns.create({
        store: storeId,
        name: campaignData.name,
        subject: campaignData.subject,
        from_name: campaignData.from_name,
        from_email: campaignData.from_email,
        reply_to: campaignData.reply_to,
        target_audience: 'custom',
        template: selectedTemplate?.id || '',
      });

      // Send campaign
      const result = await marketingService.emailCampaigns.send(campaign.id);

      if (result.success) {
        toast.success(`Campanha enviada! ${result.sent} emails enviados.`);
        navigate('/marketing');
      } else {
        toast.error(result.error || 'Erro ao enviar campanha');
      }
    } catch (error) {
      logger.error('Failed to send campaign', error);
      toast.error('Erro ao enviar campanha');
    } finally {
      setSending(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'template':
        return !!selectedTemplate;
      case 'content':
        return !!campaignData.subject && !!campaignData.name;
      case 'audience':
        return campaignData.recipient_list.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  if (!storeId) {
    return (
      <div className="p-6 text-center">
        <EnvelopeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma loja selecionada</h2>
        <p className="text-gray-500 mb-4">Selecione uma loja para criar campanhas.</p>
        <Button onClick={() => navigate('/stores')}>Ver Lojas</Button>
      </div>
    );
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/marketing')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Nova Campanha de Email</h1>
                <p className="text-sm text-gray-500">{storeName}</p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isPast = STEPS.findIndex(s => s.id === currentStep) > index;

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => isPast && setCurrentStep(step.id)}
                    disabled={!isPast && !isActive}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : isPast
                        ? 'bg-green-100 text-green-700 cursor-pointer'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{step.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 ${isPast ? 'bg-green-300' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Step: Template */}
        {currentStep === 'template' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Escolha um Template</h2>
              <p className="text-gray-500">Selecione um template para começar sua campanha.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`bg-white rounded-xl border text-left cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplate?.id === template.id
                      ? 'ring-2 ring-primary-500'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden rounded-t-xl">
                    <div
                      className="absolute inset-0 scale-[0.25] origin-top-left pointer-events-none"
                      dangerouslySetInnerHTML={{ __html: template.html_content.slice(0, 1500) }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">{template.subject}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Content */}
        {currentStep === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Informações da Campanha</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Campanha
                    </label>
                    <input
                      type="text"
                      value={campaignData.name}
                      onChange={e => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: Promoção de Natal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assunto do Email
                    </label>
                    <input
                      type="text"
                      value={campaignData.subject}
                      onChange={e => setCampaignData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: 🎁 Presente especial para você!"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Remetente
                    </label>
                    <input
                      type="text"
                      value={campaignData.from_name}
                      onChange={e => setCampaignData(prev => ({ ...prev, from_name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: Pastita"
                    />
                  </div>
                </div>
              </Card>

              {selectedTemplate && selectedTemplate.variables.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Variáveis do Template</h3>
                  <div className="space-y-4">
                    {selectedTemplate.variables.map(variable => (
                      <div key={variable}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {`{{${variable}}}`}
                        </label>
                        <input
                          type="text"
                          value={campaignData.variables[variable] || ''}
                          onChange={e => handleVariableChange(variable, e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder={`Valor para ${variable}`}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <div>
              <Card className="p-4 sticky top-32">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Preview</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPreview(true)}
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    Tela Cheia
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-100" style={{ height: '400px' }}>
                  <iframe
                    srcDoc={getPreviewHtml()}
                    className="w-full h-full"
                    title="Email Preview"
                  />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Step: Audience */}
        {currentStep === 'audience' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Adicionar Destinatários</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={recipientInput.email}
                  onChange={e => setRecipientInput(prev => ({ ...prev, email: e.target.value }))}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Email"
                  onKeyDown={e => e.key === 'Enter' && handleAddRecipient()}
                />
                <input
                  type="text"
                  value={recipientInput.name}
                  onChange={e => setRecipientInput(prev => ({ ...prev, name: e.target.value }))}
                  className="w-48 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nome (opcional)"
                  onKeyDown={e => e.key === 'Enter' && handleAddRecipient()}
                />
                <Button onClick={handleAddRecipient}>Adicionar</Button>
              </div>

              {campaignData.recipient_list.length > 0 ? (
                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {campaignData.recipient_list.map((recipient, index) => (
                    <div key={index} className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-gray-900">{recipient.email}</p>
                        {recipient.name && (
                          <p className="text-sm text-gray-500">{recipient.name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveRecipient(recipient.email)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum destinatário adicionado</p>
                </div>
              )}

              <p className="text-sm text-gray-500 mt-4">
                Total: {campaignData.recipient_list.length} destinatário(s)
              </p>
            </Card>
          </div>
        )}

        {/* Step: Review */}
        {currentStep === 'review' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Resumo da Campanha</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Nome:</dt>
                    <dd className="font-medium">{campaignData.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Assunto:</dt>
                    <dd className="font-medium">{campaignData.subject}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Remetente:</dt>
                    <dd className="font-medium">{campaignData.from_name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Template:</dt>
                    <dd className="font-medium">{selectedTemplate?.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Destinatários:</dt>
                    <dd className="font-medium">{campaignData.recipient_list.length}</dd>
                  </div>
                </dl>
              </Card>

              <Card className="p-6 bg-yellow-50 border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Atenção</h3>
                <p className="text-yellow-700 text-sm">
                  Ao enviar a campanha, os emails serão disparados imediatamente para todos os
                  destinatários. Certifique-se de que todas as informações estão corretas.
                </p>
              </Card>
            </div>

            <div>
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Preview Final</h3>
                <div className="border rounded-lg overflow-hidden bg-gray-100" style={{ height: '400px' }}>
                  <iframe
                    srcDoc={getPreviewHtml()}
                    className="w-full h-full"
                    title="Email Preview"
                  />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="secondary"
            onClick={goToPrevStep}
            disabled={currentStep === 'template'}
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Voltar
          </Button>

          {currentStep === 'review' ? (
            <Button
              onClick={handleSendCampaign}
              disabled={sending || !canProceed()}
              className="bg-green-600 hover:bg-green-700"
            >
              {sending ? (
                <>
                  <ClockIcon className="w-5 h-5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                  Enviar Campanha
                </>
              )}
            </Button>
          ) : (
            <Button onClick={goToNextStep} disabled={!canProceed()}>
              Próximo
            </Button>
          )}
        </div>
      </div>

      {/* Full Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Preview do Email</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-4" style={{ height: 'calc(90vh - 80px)' }}>
              <iframe
                srcDoc={getPreviewHtml()}
                className="w-full h-full border rounded-lg"
                title="Email Preview Full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewCampaignPage;
