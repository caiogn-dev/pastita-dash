/**
 * New WhatsApp Campaign Page
 * 
 * Flow:
 * 1. Select WhatsApp account
 * 2. Choose message type (template or text)
 * 3. Configure message content
 * 4. Add recipients (manual, CSV, or contact list)
 * 5. Review & Send/Schedule
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DevicePhoneMobileIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  UsersIcon,
  DocumentTextIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Loading, Modal, Input } from '../../../components/common';
import { getErrorMessage } from '../../../services';
import whatsappService from '../../../services/whatsapp';
import { campaignsService } from '../../../services/campaigns';
import { WhatsAppAccount, MessageTemplate } from '../../../types';
import { useStore } from '../../../hooks';
import { getProducts as getStoreProducts, StoreProduct } from '../../../services/storesApi';

// Local type definitions for campaign page
type ContactInput = { phone: string; name?: string };
type SystemContact = { 
  phone: string; 
  name: string; 
  last_message_at?: string;
  source?: 'conversation' | 'order' | 'subscriber' | 'session';
};
import logger from '../../../services/logger';

type TemplateVariable = {
  name: string;
  source: 'body' | 'header' | 'button';
};

const formatMoney = (value?: number | string | null) => {
  const numeric = Number(value || 0);
  return numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const extractTemplateVariables = (template?: MessageTemplate): TemplateVariable[] => {
  if (!template?.components) return [];
  const found = new Map<string, TemplateVariable>();

  template.components.forEach((component: any) => {
    const type = String(component?.type || '').toUpperCase();
    const source: TemplateVariable['source'] =
      type === 'HEADER' ? 'header' : type === 'BUTTONS' ? 'button' : 'body';
    const text = String(component?.text || '');
    for (const match of text.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)) {
      found.set(match[1], { name: match[1], source });
    }
    const namedParams = component?.example?.body_text_named_params || [];
    namedParams.forEach((param: any) => {
      if (param?.param_name) {
        found.set(param.param_name, { name: param.param_name, source });
      }
    });
  });

  return Array.from(found.values());
};

const buildOfferVariables = (offerProducts: StoreProduct[]) => ({
  produto_1: offerProducts[0]?.name || '',
  preco_1: formatMoney(offerProducts[0]?.price),
  produto_2: offerProducts[1]?.name || '',
  preco_2: formatMoney(offerProducts[1]?.price),
});

const buildTemplateComponents = (
  template: MessageTemplate | undefined,
  variables: TemplateVariable[],
  imageUrl?: string
) => {
  const components: Array<Record<string, unknown>> = [];

  const hasImageHeader = template?.components?.some((component: any) =>
    String(component?.type || '').toUpperCase() === 'HEADER' &&
    String(component?.format || '').toUpperCase() === 'IMAGE'
  );

  if (hasImageHeader && imageUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: imageUrl } }],
    });
  }

  const bodyVariables = variables.filter(variable => variable.source === 'body');
  if (bodyVariables.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyVariables.map(variable => ({
        type: 'text',
        ...( /^\d+$/.test(variable.name) ? {} : { parameter_name: variable.name }),
        variable: variable.name,
        text: '',
      })),
    });
  }

  return components;
};

// =============================================================================
// TYPES
// =============================================================================

type Step = 'account' | 'message' | 'recipients' | 'review';
type MessageType = 'template' | 'text';

interface CampaignFormData {
  name: string;
  description: string;
  accountId: string;
  messageType: MessageType;
  templateId: string;
  templateName: string;
  templateLanguage: string;
  textContent: string;
  mediaUrl: string;
  mediaType: 'image' | 'document' | '';
  mediaFilename: string;
  contacts: Array<{ phone: string; name?: string }>;
  scheduledAt: string;
  messagesPerMinute: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'account', label: 'Conta', icon: DevicePhoneMobileIcon },
  { id: 'message', label: 'Mensagem', icon: ChatBubbleLeftRightIcon },
  { id: 'recipients', label: 'Destinatários', icon: UserGroupIcon },
  { id: 'review', label: 'Enviar', icon: PaperAirplaneIcon },
];

// =============================================================================
// COMPONENT
// =============================================================================

export const NewWhatsAppCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId, storeName } = useStore();

  // State
  const [currentStep, setCurrentStep] = useState<Step>('account');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [contactLists, setContactLists] = useState<Array<{ id: string; name: string; contact_count: number; contacts: ContactInput[] }>>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSystemContactsModal, setShowSystemContactsModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [newContact, setNewContact] = useState({ phone: '', name: '' });
  const [systemContacts, setSystemContacts] = useState<SystemContact[]>([]);
  const [loadingSystemContacts, setLoadingSystemContacts] = useState(false);
  const [selectedSystemContacts, setSelectedSystemContacts] = useState<Set<string>>(new Set());
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedOfferProductIds, setSelectedOfferProductIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    accountId: '',
    messageType: 'template',
    templateId: '',
    templateName: '',
    templateLanguage: 'pt_BR',
    textContent: '',
    mediaUrl: '',
    mediaType: '',
    mediaFilename: '',
    contacts: [],
    scheduledAt: '',
    messagesPerMinute: 60,
  });

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load accounts (required)
        const accountsRes = await whatsappService.getAccounts();
        const accountsList = accountsRes.data.results || [];
        setAccounts(accountsList);

        // Auto-select first account if only one
        if (accountsList.length === 1) {
          setFormData(prev => ({ ...prev, accountId: accountsList[0].id }));
        }

        // Try to load contact lists (optional)
        try {
          const contactListsRes = await campaignsService.getContactLists();
          setContactLists(contactListsRes.results || []);
        } catch {
          setContactLists([]);
        }
      } catch (error) {
        logger.error('Failed to load accounts', error);
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  // Load templates when account is selected
  useEffect(() => {
    const loadTemplates = async () => {
      if (!formData.accountId) return;

      try {
        const templatesRes = await whatsappService.getTemplates(formData.accountId);
        const templatesList = templatesRes.data.results || [];
        setTemplates(templatesList.filter((t: any) =>
          t.status === 'approved' && String(t.category || '').toLowerCase() !== 'authentication'
        ));
      } catch (error) {
        logger.error('Failed to load templates', error);
        setTemplates([]);
      }
    };

    loadTemplates();
  }, [formData.accountId]);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const selectedAccount = useMemo(() => 
    accounts.find(a => a.id === formData.accountId),
    [accounts, formData.accountId]
  );

  const selectedTemplate = useMemo(() =>
    templates.find(t => t.id === formData.templateId),
    [templates, formData.templateId]
  );

  const recipientCount = formData.contacts.length;
  const selectedOfferProducts = useMemo(
    () => selectedOfferProductIds
      .map(id => products.find(product => product.id === id))
      .filter((product): product is StoreProduct => Boolean(product)),
    [products, selectedOfferProductIds]
  );
  const templateVariables = useMemo(
    () => extractTemplateVariables(selectedTemplate),
    [selectedTemplate]
  );
  const needsOfferProducts = useMemo(
    () => templateVariables.some(variable => ['produto_1', 'preco_1', 'produto_2', 'preco_2'].includes(variable.name)),
    [templateVariables]
  );
  const needsHeaderImage = useMemo(
    () => selectedTemplate?.components?.some((component: any) =>
      String(component?.type || '').toUpperCase() === 'HEADER' &&
      String(component?.format || '').toUpperCase() === 'IMAGE'
    ) ?? false,
    [selectedTemplate]
  );

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleAccountSelect = (accountId: string) => {
    setFormData(prev => ({
      ...prev,
      accountId,
      templateId: '',
      templateName: '',
    }));
    setCurrentStep('message');
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setFormData(prev => ({
      ...prev,
      templateId: template.id,
      templateName: template.name,
      templateLanguage: template.language,
      name: prev.name || `Campanha - ${template.name}`,
    }));
    setSelectedOfferProductIds([]);
  };

  useEffect(() => {
    const loadProducts = async () => {
      if (!storeId || !formData.templateId || !needsOfferProducts) {
        setProducts([]);
        return;
      }

      setLoadingProducts(true);
      try {
        const allProducts: StoreProduct[] = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage && page <= 10) {
          const response = await getStoreProducts({
            store: storeId,
            status: 'active',
            page,
            page_size: 200,
            ordering: 'category__name,name',
          });
          allProducts.push(...(response.results || []));
          hasNextPage = Boolean(response.next);
          page += 1;
        }

        const saleProducts = allProducts.filter(product =>
          String(product.category_name || '').toLowerCase().includes('salada') &&
          !(product.tags || []).some(tag => String(tag).toLowerCase() === 'ingrediente')
        );
        setProducts(saleProducts);
      } catch (error) {
        logger.error('Failed to load campaign products', error);
        toast.error('Erro ao carregar produtos da loja');
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [storeId, formData.templateId, needsOfferProducts]);

  const handleToggleOfferProduct = (productId: string) => {
    setSelectedOfferProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      if (prev.length >= 2) {
        return [prev[1], productId];
      }
      return [...prev, productId];
    });
  };

  const handleLoadSystemContacts = async () => {
    setLoadingSystemContacts(true);
    setShowSystemContactsModal(true);
    try {
      const response = await campaignsService.getSystemContacts({
        account_id: formData.accountId || undefined,
        source: 'all',
        limit: 500,
      });
      const contacts: SystemContact[] = response.results.map(contact => ({
        phone: contact.phone,
        name: contact.name || '',
        source: contact.source,
      }));
      setSystemContacts(contacts);
      setSelectedSystemContacts(new Set());
    } catch (error) {
      logger.error('Failed to load system contacts', error);
      toast.error('Erro ao carregar contatos');
      setSystemContacts([]);
    } finally {
      setLoadingSystemContacts(false);
    }
  };

  const handleToggleSystemContact = (phone: string) => {
    setSelectedSystemContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phone)) {
        newSet.delete(phone);
      } else {
        newSet.add(phone);
      }
      return newSet;
    });
  };

  const handleSelectAllSystemContacts = () => {
    if (selectedSystemContacts.size === systemContacts.length) {
      setSelectedSystemContacts(new Set());
    } else {
      setSelectedSystemContacts(new Set(systemContacts.map(c => c.phone)));
    }
  };

  const handleAddSystemContacts = () => {
    const existingPhones = new Set(formData.contacts.map(c => c.phone));
    const newContacts: ContactInput[] = [];

    systemContacts.forEach(contact => {
      if (selectedSystemContacts.has(contact.phone) && !existingPhones.has(contact.phone)) {
        newContacts.push({ phone: contact.phone, name: contact.name });
      }
    });

    if (newContacts.length === 0) {
      toast.error('Nenhum contato novo selecionado');
      return;
    }

    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, ...newContacts],
    }));

    toast.success(`${newContacts.length} contatos adicionados`);
    setShowSystemContactsModal(false);
    setSelectedSystemContacts(new Set());
  };

  const handleAddContact = () => {
    if (!newContact.phone) {
      toast.error('Informe o número de telefone');
      return;
    }

    // Clean phone number
    const cleanPhone = newContact.phone.replace(/\D/g, '');
    
    // Check for duplicates
    if (formData.contacts.some(c => c.phone.replace(/\D/g, '') === cleanPhone)) {
      toast.error('Este número já foi adicionado');
      return;
    }

    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { phone: cleanPhone, name: newContact.name }],
    }));
    setNewContact({ phone: '', name: '' });
  };

  const handleRemoveContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index),
    }));
  };

  const handleImportCSV = () => {
    if (!csvContent.trim()) {
      toast.error('Cole o conteúdo do CSV');
      return;
    }

    try {
      const lines = csvContent.trim().split('\n');
      const newContacts: ContactInput[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Skip header if present
        if (i === 0 && (line.toLowerCase().includes('phone') || line.toLowerCase().includes('telefone'))) {
          continue;
        }

        const parts = line.split(/[,;\t]/);
        const phone = parts[0]?.replace(/\D/g, '');
        const name = parts[1]?.trim() || '';

        if (phone && phone.length >= 10) {
          newContacts.push({ phone, name });
        }
      }

      if (newContacts.length === 0) {
        toast.error('Nenhum contato válido encontrado');
        return;
      }

      // Merge with existing, avoiding duplicates
      const existingPhones = new Set(formData.contacts.map(c => c.phone));
      const uniqueNew = newContacts.filter(c => !existingPhones.has(c.phone));

      setFormData(prev => ({
        ...prev,
        contacts: [...prev.contacts, ...uniqueNew],
      }));

      toast.success(`${uniqueNew.length} contatos importados`);
      setShowImportModal(false);
      setCsvContent('');
    } catch (error) {
      logger.error('CSV import error', error);
      toast.error('Erro ao processar CSV');
    }
  };

  const handleLoadContactList = async (listId: string) => {
    try {
      const list = await campaignsService.getContactList(listId);
      
      // Merge contacts
      const existingPhones = new Set(formData.contacts.map(c => c.phone));
      const uniqueNew = list.contacts.filter((c: { phone: string }) => !existingPhones.has(c.phone));

      setFormData(prev => ({
        ...prev,
        contacts: [...prev.contacts, ...uniqueNew],
      }));

      toast.success(`${uniqueNew.length} contatos adicionados da lista "${list.name}"`);
    } catch (error) {
      logger.error('Failed to load contact list', error);
      toast.error('Erro ao carregar lista de contatos');
    }
  };

  const handleSendCampaign = async (schedule: boolean = false) => {
    if (!formData.accountId) {
      toast.error('Selecione uma conta WhatsApp');
      return;
    }

    if (formData.messageType === 'template' && !formData.templateId) {
      toast.error('Selecione um template');
      return;
    }

    if (formData.messageType === 'text' && !formData.textContent.trim() && !selectedMediaFile && !formData.mediaUrl) {
      toast.error('Digite o conteúdo da mensagem ou adicione uma imagem');
      return;
    }

    if (formData.contacts.length === 0) {
      toast.error('Adicione pelo menos um destinatário');
      return;
    }

    if (schedule && !formData.scheduledAt) {
      toast.error('Selecione a data/hora do agendamento');
      return;
    }

    setSending(true);
    try {
      let mediaPayload = {
        media_url: formData.mediaUrl,
        media_type: formData.mediaType,
        filename: formData.mediaFilename,
      };

      if (selectedMediaFile && !mediaPayload.media_url) {
        const uploaded = await campaignsService.uploadCampaignMedia(selectedMediaFile);
        mediaPayload = {
          media_url: uploaded.media_url,
          media_type: uploaded.media_type,
          filename: uploaded.filename,
        };
      }

      const mediaContent = mediaPayload.media_url
        ? {
            ...mediaPayload,
            ...(mediaPayload.media_type === 'image' ? { image_url: mediaPayload.media_url } : {}),
            ...(mediaPayload.media_type === 'document' ? { document_url: mediaPayload.media_url } : {}),
          }
        : {};

      const templateComponents = formData.messageType === 'template'
        ? buildTemplateComponents(selectedTemplate, templateVariables, mediaPayload.media_url)
        : [];
      const offerVariables = buildOfferVariables(selectedOfferProducts);
      const contactsWithVariables = formData.contacts.map(contact => ({
        ...contact,
        variables: formData.messageType === 'template'
          ? {
              nome_cliente: contact.name?.trim() || 'Cliente',
              ...offerVariables,
            }
          : undefined,
      }));

      // Build campaign payload
      const payload = {
        account_id: formData.accountId,
        name: formData.name || `Campanha WhatsApp - ${new Date().toLocaleDateString('pt-BR')}`,
        description: formData.description,
        campaign_type: 'broadcast' as const,
        template_id: formData.messageType === 'template' ? formData.templateId : undefined,
        message_content: formData.messageType === 'text' 
          ? {
              text: formData.textContent,
              caption: formData.textContent,
              ...mediaContent,
            }
          : {
              template_name: formData.templateName,
              language: formData.templateLanguage,
              components: templateComponents,
              offer_products: selectedOfferProducts.map(product => ({
                id: product.id,
                name: product.name,
                price: product.price,
                compare_at_price: product.compare_at_price,
              })),
              ...mediaContent,
            },
        contact_list: contactsWithVariables,
        scheduled_at: schedule ? formData.scheduledAt : undefined,
        messages_per_minute: formData.messagesPerMinute,
      };

      logger.info('Creating WhatsApp campaign', { payload });

      // Create campaign
      const campaign = await campaignsService.createCampaign(payload);

      if (schedule) {
        // Schedule the campaign
        await campaignsService.scheduleCampaign(campaign.id, formData.scheduledAt);
        toast.success(`🎉 Campanha agendada para ${new Date(formData.scheduledAt).toLocaleString('pt-BR')}`);
      } else {
        // Start immediately
        await campaignsService.startCampaign(campaign.id);
        toast.success(`🎉 Campanha iniciada! Enviando para ${recipientCount} contatos...`);
      }

      navigate('/marketing/whatsapp');
    } catch (error: unknown) {
      logger.error('Failed to create campaign', error);
      toast.error(getErrorMessage(error) || 'Erro ao criar campanha');
    } finally {
      setSending(false);
      setShowScheduleModal(false);
    }
  };

  // =============================================================================
  // NAVIGATION
  // =============================================================================

  const canProceed = () => {
    switch (currentStep) {
      case 'account':
        return !!formData.accountId;
      case 'message':
        if (formData.messageType === 'template') {
          if (!formData.templateId) return false;
          if (needsOfferProducts && selectedOfferProducts.length < 2) return false;
          if (needsHeaderImage && !selectedMediaFile && !formData.mediaUrl) return false;
          return true;
        }
        return !!formData.textContent.trim() || !!selectedMediaFile || !!formData.mediaUrl;
      case 'recipients':
        return formData.contacts.length > 0;
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

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return <Loading />;
  }

  if (accounts.length === 0) {
    return (
      <div className="p-6 text-center">
        <DevicePhoneMobileIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nenhuma conta WhatsApp</h2>
        <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-4">Configure uma conta WhatsApp para criar campanhas.</p>
        <Button onClick={() => navigate('/accounts/new')}>Adicionar Conta</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/marketing/whatsapp')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-hover,#161616)] rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">Nova Campanha WhatsApp</h1>
                {selectedAccount && (
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                    {selectedAccount.name} • {selectedAccount.display_phone_number || selectedAccount.phone_number}
                  </p>
                )}
              </div>
            </div>
            
            {/* Recipient count badge */}
            {currentStep !== 'account' && recipientCount > 0 && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
                <UsersIcon className="w-4 h-4" />
                <span className="font-medium">{recipientCount} destinatários</span>
              </div>
            )}
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
                        ? 'bg-green-100 text-green-700'
                        : isPast
                        ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isPast ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
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
        {/* Step: Account Selection */}
        {currentStep === 'account' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Selecione a Conta WhatsApp
              </h2>
              <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                Escolha a conta que será usada para enviar as mensagens
              </p>
            </div>

            <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.accountId === account.id
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-zinc-800 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      account.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <DevicePhoneMobileIcon className={`w-6 h-6 ${
                        account.status === 'active' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{account.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                        {account.display_phone_number || account.phone_number}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      account.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {account.status === 'active' ? 'Ativa' : account.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Message Configuration */}
        {currentStep === 'message' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Configure a Mensagem
              </h2>
              <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                Escolha o tipo de mensagem e configure o conteúdo
              </p>
            </div>

            {/* Campaign Name */}
            <Card className="p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
                Nome da Campanha
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Promoção de Janeiro"
              />
            </Card>

            {/* Message Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormData(prev => ({ ...prev, messageType: 'template' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.messageType === 'template'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-green-300'
                }`}
              >
                <DocumentTextIcon className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Template</h3>
                <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                  Use um template aprovado pelo WhatsApp
                </p>
              </button>

              <button
                onClick={() => setFormData(prev => ({ ...prev, messageType: 'text' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.messageType === 'text'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-green-300'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Texto Livre</h3>
                <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                  Envie uma mensagem de texto personalizada
                </p>
              </button>
            </div>

            {/* Template Selection */}
            {formData.messageType === 'template' && (
              <Card className="p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
                  Selecione o Template
                </label>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum template aprovado encontrado</p>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => whatsappService.syncTemplates(formData.accountId).then(() => {
                        toast.success('Templates sincronizados');
                        // Reload templates
                        whatsappService.getTemplates(formData.accountId)
                          .then(res => setTemplates(res.data.results.filter((t: any) =>
                            t.status === 'approved' && String(t.category || '').toLowerCase() !== 'authentication'
                          )));
                      })}
                    >
                      Sincronizar Templates
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.templateId === template.id
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-zinc-800 hover:border-green-300'
                        }`}
                      >
                        <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.category} • {template.language}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {formData.messageType === 'template' && selectedTemplate && (
              <div className="space-y-4">
                {needsOfferProducts && (
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Produtos da oferta
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mt-1">
                          Selecione 2 saladas do cardápio. O preço promocional vem do campo preço de venda; o comparativo vem do preço comparativo do produto.
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] whitespace-nowrap">
                        {selectedOfferProducts.length}/2 selecionados
                      </span>
                    </div>

                    {!storeId ? (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                        Selecione uma loja no topo do painel para carregar o cardápio.
                      </div>
                    ) : loadingProducts ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Nenhuma salada ativa encontrada para {storeName || 'esta loja'}.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-1">
                        {products.map(product => {
                          const selectedIndex = selectedOfferProductIds.indexOf(product.id);
                          const isSelected = selectedIndex >= 0;
                          const compareAt = Number(product.compare_at_price || 0);
                          const price = Number(product.price || 0);
                          const hasDiscount = compareAt > price;

                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleToggleOfferProduct(product.id)}
                              className={`flex gap-3 p-3 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : 'border-gray-200 dark:border-zinc-800 hover:border-green-300'
                              }`}
                            >
                              <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-[var(--dark-bg-hover,#161616)] overflow-hidden shrink-0">
                                {product.main_image_url ? (
                                  <img
                                    src={product.main_image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <PhotoIcon className="w-7 h-7 text-gray-400 m-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">
                                    {product.name}
                                  </p>
                                  {isSelected && (
                                    <span className="shrink-0 rounded-full bg-green-600 text-white text-xs font-semibold px-2 py-0.5">
                                      {selectedIndex + 1}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] truncate">
                                  {product.category_name || 'Sem categoria'}
                                </p>
                                <div className="mt-2 flex items-baseline gap-2">
                                  {hasDiscount && (
                                    <span className="text-xs text-gray-400 line-through">
                                      R$ {formatMoney(compareAt)}
                                    </span>
                                  )}
                                  <span className="font-semibold text-green-700">
                                    R$ {formatMoney(price)}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-xs text-green-700">
                                      -{product.discount_percentage}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedOfferProducts.length > 0 && (
                      <div className="mt-4 rounded-lg bg-gray-50 dark:bg-[var(--dark-bg-hover,#161616)] p-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Variáveis que serão enviadas
                        </p>
                        <div className="grid grid-cols-2 max-md:grid-cols-1 gap-2 text-sm text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                          <span>{'{{produto_1}}'}: {selectedOfferProducts[0]?.name || '-'}</span>
                          <span>{'{{preco_1}}'}: {selectedOfferProducts[0] ? formatMoney(selectedOfferProducts[0].price) : '-'}</span>
                          <span>{'{{produto_2}}'}: {selectedOfferProducts[1]?.name || '-'}</span>
                          <span>{'{{preco_2}}'}: {selectedOfferProducts[1] ? formatMoney(selectedOfferProducts[1].price) : '-'}</span>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {needsHeaderImage && (
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Imagem do template
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mt-1">
                          Esta imagem será usada no cabeçalho do template aprovado.
                        </p>
                      </div>
                      {(selectedMediaFile || formData.mediaUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (mediaPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(mediaPreviewUrl);
                            setSelectedMediaFile(null);
                            setMediaPreviewUrl('');
                            setFormData(prev => ({ ...prev, mediaUrl: '', mediaType: '', mediaFilename: '' }));
                          }}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Remover imagem"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {mediaPreviewUrl ? (
                      <img
                        src={mediaPreviewUrl}
                        alt="Preview da imagem do template"
                        className="w-48 h-48 rounded-lg object-cover border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] rounded-lg p-8 cursor-pointer hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                        <PhotoIcon className="w-10 h-10 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                          Selecionar imagem
                        </span>
                        <span className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                          PNG, JPG ou WEBP
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (!file.type.startsWith('image/')) {
                              toast.error('Selecione uma imagem válida');
                              return;
                            }
                            if (mediaPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(mediaPreviewUrl);
                            setSelectedMediaFile(file);
                            setMediaPreviewUrl(URL.createObjectURL(file));
                            setFormData(prev => ({
                              ...prev,
                              mediaUrl: '',
                              mediaType: 'image',
                              mediaFilename: file.name,
                            }));
                          }}
                        />
                      </label>
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* Text Content */}
            {formData.messageType === 'text' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
                    Mensagem
                  </label>
                  <textarea
                    value={formData.textContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
                    placeholder="Digite sua mensagem aqui..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-[var(--dark-bg-hover,#161616)] dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Use {"{{nome}}"} para personalizar com o nome do contato
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                        Card promocional
                      </label>
                      <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mt-1">
                        Anexe uma imagem para enviar junto com a legenda.
                      </p>
                    </div>
                    {(selectedMediaFile || formData.mediaUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (mediaPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(mediaPreviewUrl);
                          setSelectedMediaFile(null);
                          setMediaPreviewUrl('');
                          setFormData(prev => ({ ...prev, mediaUrl: '', mediaType: '', mediaFilename: '' }));
                        }}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remover imagem"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {mediaPreviewUrl ? (
                    <div className="flex items-start gap-4">
                      <img
                        src={mediaPreviewUrl}
                        alt="Preview do card promocional"
                        className="w-40 h-40 rounded-lg object-cover border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {formData.mediaFilename || selectedMediaFile?.name || 'Imagem da campanha'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mt-1">
                          Será enviada como imagem no WhatsApp.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] rounded-lg p-8 cursor-pointer hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                      <PhotoIcon className="w-10 h-10 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                        Selecionar imagem
                      </span>
                      <span className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                        PNG, JPG ou WEBP
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith('image/')) {
                            toast.error('Selecione uma imagem válida');
                            return;
                          }
                          if (mediaPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(mediaPreviewUrl);
                          setSelectedMediaFile(file);
                          setMediaPreviewUrl(URL.createObjectURL(file));
                          setFormData(prev => ({
                            ...prev,
                            mediaUrl: '',
                            mediaType: 'image',
                            mediaFilename: file.name,
                          }));
                        }}
                      />
                    </label>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Step: Recipients */}
        {currentStep === 'recipients' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Adicione os Destinatários
              </h2>
              <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                Adicione os contatos que receberão a mensagem
              </p>
            </div>

            {/* Add Contact Form */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Adicionar Contato</h3>
              <div className="flex gap-3">
                <Input
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Telefone (ex: 5511999999999)"
                  className="flex-1"
                />
                <Input
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome (opcional)"
                  className="flex-1"
                />
                <Button onClick={handleAddContact}>
                  <PlusIcon className="w-5 h-5" />
                </Button>
              </div>
            </Card>

            {/* Import Options */}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleLoadSystemContacts}>
                <UserGroupIcon className="w-5 h-5 mr-2" />
                Carregar do Sistema
              </Button>
              
              <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                Importar CSV
              </Button>
              
              {contactLists.length > 0 && (
                <select
                  onChange={(e) => e.target.value && handleLoadContactList(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] rounded-lg bg-white dark:bg-[var(--dark-bg-hover,#161616)] text-gray-900 dark:text-white"
                  defaultValue=""
                >
                  <option value="">Carregar lista salva...</option>
                  {contactLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name} ({list.contact_count} contatos)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Contact List */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Contatos ({formData.contacts.length})
                </h3>
                {formData.contacts.length > 0 && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, contacts: [] }))}
                  >
                    Limpar Todos
                  </Button>
                )}
              </div>

              {formData.contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum contato adicionado</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {formData.contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[var(--dark-bg-hover,#161616)] rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {contact.phone}
                        </span>
                        {contact.name && (
                          <span className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] ml-2">
                            ({contact.name})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveContact(index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Step: Review */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Revise e Envie
              </h2>
              <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                Confira os detalhes da campanha antes de enviar
              </p>
            </div>

            {/* Summary */}
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Campanha</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.name || 'Sem nome'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Conta</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedAccount?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Tipo de Mensagem</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.messageType === 'template' ? 'Template' : 'Texto Livre'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">Destinatários</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {recipientCount} contatos
                  </p>
                </div>
              </div>

              {formData.messageType === 'template' && selectedTemplate && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-1">Template</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTemplate.name}
                  </p>
                  {selectedOfferProducts.length > 0 && (
                    <div className="mt-3 rounded-lg bg-gray-50 dark:bg-[var(--dark-bg-hover,#161616)] p-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Produtos da oferta
                      </p>
                      <div className="space-y-2">
                        {selectedOfferProducts.map(product => (
                          <div key={product.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-900 dark:text-white">{product.name}</span>
                            <span className="font-medium text-green-700">R$ {formatMoney(product.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(mediaPreviewUrl || formData.mediaUrl) && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-1">Imagem do cabeçalho</p>
                      <img
                        src={mediaPreviewUrl || formData.mediaUrl}
                        alt="Imagem do template"
                        className="w-48 h-48 rounded-lg object-cover border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                </div>
              )}

              {formData.messageType === 'text' && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-1">Mensagem</p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap bg-gray-50 dark:bg-[var(--dark-bg-hover,#161616)] p-3 rounded-lg">
                    {formData.textContent || 'Imagem sem legenda'}
                  </p>
                  {(mediaPreviewUrl || formData.mediaUrl) && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-1">Imagem</p>
                      <img
                        src={mediaPreviewUrl || formData.mediaUrl}
                        alt="Card promocional"
                        className="w-48 h-48 rounded-lg object-cover border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Rate Limiting */}
              <div className="pt-4 border-t">
                <label className="block text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-2">
                  Velocidade de Envio
                </label>
                <select
                  value={formData.messagesPerMinute}
                  onChange={(e) => setFormData(prev => ({ ...prev, messagesPerMinute: Number(e.target.value) }))}
                  className="px-3 py-2 border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] rounded-lg bg-white dark:bg-[var(--dark-bg-hover,#161616)] text-gray-900 dark:text-white"
                >
                  <option value={30}>30 mensagens/minuto (Conservador)</option>
                  <option value={60}>60 mensagens/minuto (Recomendado)</option>
                  <option value={120}>120 mensagens/minuto (Rápido)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Tempo estimado: ~{Math.ceil(recipientCount / formData.messagesPerMinute)} minutos
                </p>
              </div>
            </Card>

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Atenção:</strong> Certifique-se de que todos os contatos consentiram em receber mensagens. 
                O envio de spam pode resultar em bloqueio da sua conta WhatsApp Business.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="secondary"
            onClick={goToPrevStep}
            disabled={currentStep === 'account'}
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Voltar
          </Button>

          <div className="flex gap-3">
            {currentStep === 'review' ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowScheduleModal(true)}
                  disabled={sending}
                >
                  <ClockIcon className="w-5 h-5 mr-2" />
                  Agendar
                </Button>
                <Button
                  onClick={() => handleSendCampaign(false)}
                  disabled={sending || !canProceed()}
                >
                  {sending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                      Enviar Agora
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={goToNextStep} disabled={!canProceed()}>
                Continuar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Agendar Campanha"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
              Data e Hora
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-[var(--dark-bg-hover,#161616)] dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleSendCampaign(true)} disabled={sending || !formData.scheduledAt}>
              {sending ? 'Agendando...' : 'Confirmar Agendamento'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar Contatos do CSV"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
            Cole o conteúdo do CSV abaixo. Formato esperado: telefone,nome (uma linha por contato)
          </p>
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="5511999999999,João Silva&#10;5511888888888,Maria Santos"
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-[var(--dark-bg-hover,#161616)] dark:text-white font-mono text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportCSV}>
              Importar
            </Button>
          </div>
        </div>
      </Modal>

      {/* System Contacts Modal */}
      <Modal
        isOpen={showSystemContactsModal}
        onClose={() => setShowSystemContactsModal(false)}
        title="Contatos do Sistema"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
            Selecione os contatos que deseja adicionar à campanha
          </p>
          
          {loadingSystemContacts ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : systemContacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum contato encontrado no sistema</p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[var(--dark-bg-hover,#161616)] rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSystemContacts.size === systemContacts.length}
                    onChange={handleSelectAllSystemContacts}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Selecionar todos ({systemContacts.length})
                  </span>
                </label>
                <span className="text-sm text-gray-500">
                  {selectedSystemContacts.size} selecionados
                </span>
              </div>

              {/* Contact List */}
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
                {systemContacts.map((contact) => (
                  <label
                    key={contact.phone}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSystemContacts.has(contact.phone)}
                      onChange={() => handleToggleSystemContact(contact.phone)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {contact.phone}
                      </p>
                      {contact.name && (
                        <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] truncate">
                          {contact.name}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      contact.source === 'conversation' ? 'bg-blue-100 text-blue-700' :
                      contact.source === 'order' ? 'bg-green-100 text-green-700' :
                      contact.source === 'subscriber' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {contact.source === 'conversation' ? 'Conversa' :
                       contact.source === 'order' ? 'Pedido' :
                       contact.source === 'subscriber' ? 'Inscrito' :
                       contact.source === 'session' ? 'Sessão' : contact.source}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowSystemContactsModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddSystemContacts}
              disabled={selectedSystemContacts.size === 0}
            >
              Adicionar {selectedSystemContacts.size > 0 ? `(${selectedSystemContacts.size})` : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NewWhatsAppCampaignPage;
