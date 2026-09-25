/**
 * Nova campanha de WhatsApp — "prévia ao lado com números" (direção do dono,
 * 25/09/2026).
 *
 * Duas colunas:
 *
 *   esquerda  o assistente (Conta → Destinatários → Mensagem → Enviar), no
 *             `FormStepper` do kit.
 *   direita   FIXA: a mensagem dentro de um balão de conversa, com as
 *             variáveis já trocadas pelo primeiro cliente da lista, e embaixo
 *             o resumo em números — quantos recebem, por qual conta, quando e
 *             quanto tempo leva.
 *
 * A tela antiga era uma faixa estreita: o dono escrevia sem ver como a
 * mensagem chegava e só descobria para quantos ia na última tela. Agora as
 * duas respostas estão sempre visíveis, e o botão final diz o que faz:
 * "Enviar para 312 clientes".
 *
 * Cores só de token. O verde fica reservado para o botão final (variant
 * `success`) — o resto da tela usa o dourado da marca, como o painel todo.
 *
 * O ENVIO NÃO MUDOU. O payload, as validações e a ordem criar → iniciar estão
 * travados por `__tests__/NewWhatsAppCampaignPage.envio.test.tsx`.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DevicePhoneMobileIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Loading, Modal } from '../../../components/common';
import {
  Button,
  ChoiceCards,
  EmptyState,
  FormStepper,
  FormSummary,
  PageShell,
} from '../../../components/ui';
import { BalaoDeWhatsApp } from '../../../components/marketing/BalaoDeWhatsApp';
import { variaveisDaOferta } from './variaveisDaOferta';
import { getErrorMessage } from '../../../services';
import whatsappService from '../../../services/whatsapp';
import { campaignsService } from '../../../services/campaigns';
import { WhatsAppAccount, MessageTemplate } from '../../../types';
import { useStore } from '../../../hooks';
import { getProducts as getStoreProducts, StoreProduct } from '../../../services/storesApi';
import logger from '../../../services/logger';
import { avisoDaJanela, horarioParaConsulta, type ResumoDaJanela } from './janelaDe24h';
import { LinhaDoDia } from '../../../components/campanhas/LinhaDoDia';
import { horarioPermitido } from './linhaDoDia';
import { precoVigenteDoProduto } from '../../../utils/precoVigente';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

import {
  componentesDoTemplate,
  variaveisDoTemplate,
} from './campanha/componentesDoTemplate';
import { contatosDoCsv } from './campanha/contatosDoCsv';
import { CampoDeImagem } from './campanha/CampoDeImagem';
import {
  clientes,
  exemploDeCliente,
  previaDaMensagem,
  rotuloDoEnvio,
  tempoDeEnvio,
  NOME_DE_EXEMPLO,
} from './campanha/previaDaMensagem';
import { PassoDaConta } from './campanha/passos/PassoDaConta';
import { PassoDaRevisao } from './campanha/passos/PassoDaRevisao';
import { PassoDosDestinatarios } from './campanha/passos/PassoDosDestinatarios';
import {
  PASSOS,
  podeAvancar,
  proximoPasso,
  type PassoDaCampanha,
  type TipoDeMensagem,
} from './campanha/passosDaCampanha';

// Local type definitions for campaign page
type ContactInput = { phone: string; name?: string };
type SystemContact = {
  phone: string;
  name: string;
  last_message_at?: string;
  source?: 'conversation' | 'order' | 'subscriber' | 'session';
};

// =============================================================================
// TYPES
// =============================================================================

interface CampaignFormData {
  name: string;
  description: string;
  accountId: string;
  messageType: TipoDeMensagem;
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

/**
 * A ORDEM e os rótulos vivem em `campanha/passosDaCampanha`, junto das regras
 * de avanço — duas listas separadas divergem, e aqui divergir significa o
 * indicador de progresso apontar um passo e a validação cobrar outro.
 * O ícone é só apresentação, então mora aqui.
 */
const ICONE_DO_PASSO: Record<PassoDaCampanha, React.ComponentType<{ className?: string }>> = {
  account: DevicePhoneMobileIcon,
  message: ChatBubbleLeftRightIcon,
  recipients: UserGroupIcon,
  review: PaperAirplaneIcon,
};

const PASSOS_DO_ASSISTENTE = PASSOS.map((passo) => ({
  id: passo.id,
  rotulo: passo.label,
  icone: ICONE_DO_PASSO[passo.id],
}));

const TIPOS_DE_MENSAGEM = [
  {
    valor: 'template' as const,
    titulo: 'Template aprovado',
    descricao: 'Aprovado pela Meta. Chega para qualquer cliente da lista.',
    icone: DocumentTextIcon,
  },
  {
    valor: 'text' as const,
    titulo: 'Texto livre',
    descricao: 'Escrito agora. Só chega para quem falou com a loja nas últimas 24h.',
    icone: ChatBubbleLeftRightIcon,
  },
];

const ROTULO_DA_ORIGEM: Record<string, string> = {
  conversation: 'Conversa',
  order: 'Pedido',
  subscriber: 'Inscrito',
  session: 'Sessão',
};

/** A Meta devolve a categoria em caixa alta ("MARKETING"). */
const categoriaLegivel = (categoria?: string) => {
  const c = String(categoria || '').toLowerCase();
  if (c === 'marketing') return 'Marketing';
  if (c === 'utility') return 'Utilidade';
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Sem categoria';
};

const templatesUteis = (lista: MessageTemplate[]) =>
  lista.filter(
    (t) => t.status === 'approved' && String(t.category || '').toLowerCase() !== 'authentication',
  );

const dataEHora = (valor: string) =>
  new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// =============================================================================
// COMPONENT
// =============================================================================

export const NewWhatsAppCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId, storeSlug, storeName } = useStore();

  // State
  const [currentStep, setPassoAtual] = useState<PassoDaCampanha>('account');
  /**
   * Passos já abertos continuam MONTADOS (só escondidos). O que o dono
   * preencheu na página sobrevivia à troca de passo, mas o que mora dentro do
   * passo — o filtro de público montado pela metade, o construtor de regra
   * aberto — morria ao desmontar. Voltar de "Mensagem" para "Destinatários"
   * não pode custar refazer o público.
   */
  const [passosAbertos, setPassosAbertos] = useState<Set<PassoDaCampanha>>(() => new Set(['account']));
  const setCurrentStep = useCallback((passo: PassoDaCampanha) => {
    setPassosAbertos((abertos) => (abertos.has(passo) ? abertos : new Set(abertos).add(passo)));
    setPassoAtual(passo);
  }, []);
  const [loading, setLoading] = useState(true);
  const [falhouContas, setFalhouContas] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [sending, setSending] = useState(false);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [contactLists, setContactLists] = useState<Array<{ id: string; name: string; contact_count: number; contacts: ContactInput[] }>>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [janela, setJanela] = useState<ResumoDaJanela | null>(null);

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
  // A conta é refeita a cada mudança de horário: a janela encolhe com o tempo,
  // e quem falou com a loja há 20h está dentro agora e fora daqui a cinco.
  // Só consulta com o modal aberto — é a única tela onde o número decide algo.
  useEffect(() => {
    if (!showScheduleModal) return undefined;
    let vivo = true;
    campaignsService
      .getJanelaDaAudiencia({
        store: storeSlug || undefined,
        em: horarioParaConsulta(formData.scheduledAt),
      })
      .then((r) => { if (vivo) setJanela(r); })
      .catch(() => { if (vivo) setJanela(null); });
    return () => { vivo = false; };
  }, [showScheduleModal, formData.scheduledAt, storeSlug]);

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setFalhouContas(false);
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
        // Falha NÃO é "nenhuma conta": dizer "configure uma conta" para quem
        // tem três e perdeu a conexão é o vazio enganoso (ver CLAUDE.md).
        logger.error('Failed to load accounts', error);
        setAccounts([]);
        setFalhouContas(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tentativa]);

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  // Load templates when account is selected
  useEffect(() => {
    let vivo = true;
    const loadTemplates = async () => {
      if (!formData.accountId) return;

      setLoadingTemplates(true);
      try {
        const templatesRes = await whatsappService.getTemplates(formData.accountId);
        if (vivo) setTemplates(templatesUteis(templatesRes.data.results || []));
      } catch (error) {
        logger.error('Failed to load templates', error);
        if (vivo) setTemplates([]);
      } finally {
        if (vivo) setLoadingTemplates(false);
      }
    };

    loadTemplates();
    return () => { vivo = false; };
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
    () => variaveisDoTemplate(selectedTemplate),
    [selectedTemplate]
  );
  const needsOfferProducts = useMemo(
    () => templateVariables.some(variable => ['produto_1', 'preco_1', 'produto_2', 'preco_2'].includes(variable.nome)),
    [templateVariables]
  );
  const needsHeaderImage = useMemo(
    () => (selectedTemplate?.components as Array<{ type?: string; format?: string }> | undefined)?.some((component) =>
      String(component?.type || '').toUpperCase() === 'HEADER' &&
      String(component?.format || '').toUpperCase() === 'IMAGE'
    ) ?? false,
    [selectedTemplate]
  );

  /**
   * A prévia usa os MESMOS valores do envio: o `nome_cliente` do primeiro
   * destinatário e as variáveis da oferta. Um exemplo inventado seria a
   * prévia mentir justamente quando o dono confia nela.
   */
  const nomeDoExemplo = exemploDeCliente(formData.contacts);
  const previa = useMemo(
    () => previaDaMensagem({
      tipo: formData.messageType,
      texto: formData.textContent,
      template: formData.messageType === 'template' ? selectedTemplate : undefined,
      valores: { nome_cliente: nomeDoExemplo, ...variaveisDaOferta(selectedOfferProducts) },
    }),
    [formData.messageType, formData.textContent, selectedTemplate, nomeDoExemplo, selectedOfferProducts]
  );
  const imagemDaPrevia = mediaPreviewUrl || formData.mediaUrl || undefined;

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
    setCurrentStep(proximoPasso('account'));
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

  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      await whatsappService.syncTemplates(formData.accountId);
      const res = await whatsappService.getTemplates(formData.accountId);
      setTemplates(templatesUteis(res.data.results || []));
      toast.success('Templates sincronizados');
    } catch (error) {
      logger.error('Failed to sync templates', error);
      toast.error('Não deu para sincronizar os templates. Tente de novo.');
    } finally {
      setSyncingTemplates(false);
    }
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

  const handleEscolherImagem = (file: File) => {
    if (mediaPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(mediaPreviewUrl);
    setSelectedMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      mediaUrl: '',
      mediaType: 'image',
      mediaFilename: file.name,
    }));
  };

  const handleRemoverImagem = () => {
    if (mediaPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(mediaPreviewUrl);
    setSelectedMediaFile(null);
    setMediaPreviewUrl('');
    setFormData(prev => ({ ...prev, mediaUrl: '', mediaType: '', mediaFilename: '' }));
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

  /** Substitui a lista pelos contatos do segmento escolhido.
   *
   *  SUBSTITUI em vez de somar: o dono escolheu um segmento, e acumular com o
   *  segmento anterior produziria silenciosamente a união dos dois — que é o
   *  "todos" de antes voltando pela porta dos fundos. */
  const handleUsarAudiencia = (contatos: SystemContact[]) => {
    setFormData(prev => ({
      ...prev,
      contacts: contatos.map(c => ({ phone: c.phone, name: c.name || '' })),
    }));
    toast.success(
      contatos.length === 1
        ? '1 contato no público da campanha'
        : `${contatos.length} contatos no público da campanha`
    );
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

    // A dedupla é contra as DUAS coisas: a lista já montada e o próprio
    // arquivo. A segunda faltava — export de sistema de pedido traz o cliente
    // uma vez por compra, e a pessoa recebia a promoção repetida.
    const { contatos, repetidos, invalidos } = contatosDoCsv(csvContent, formData.contacts);

    if (contatos.length === 0) {
      toast.error('Nenhum contato novo no que foi colado');
      return;
    }

    setFormData(prev => ({ ...prev, contacts: [...prev.contacts, ...contatos] }));

    // O que foi DESCARTADO também é notícia: sem isso o dono cola 300 linhas,
    // vê "120 contatos" e não sabe o que houve com as outras 180.
    const sobras = [
      repetidos ? `${repetidos} repetido${repetidos > 1 ? 's' : ''}` : '',
      invalidos ? `${invalidos} sem telefone válido` : '',
    ].filter(Boolean);

    toast.success(
      `${contatos.length} contato${contatos.length > 1 ? 's' : ''} importado${contatos.length > 1 ? 's' : ''}` +
        (sobras.length ? ` · ${sobras.join(', ')}` : ''),
    );
    setShowImportModal(false);
    setCsvContent('');
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
        ? componentesDoTemplate(selectedTemplate, templateVariables, mediaPayload.media_url)
        : [];
      const offerVariables = variaveisDaOferta(selectedOfferProducts);
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
                price: precoVigenteDoProduto(product),
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

      // O toast repete o nome da ação do botão: "Agendar envio" → "Envio
      // agendado"; "Enviar para 312 clientes" → "Envio para 312 clientes
      // iniciado". Nome diferente no botão e no aviso faz o dono duvidar se
      // foi aquilo mesmo que aconteceu.
      if (schedule) {
        await campaignsService.scheduleCampaign(campaign.id, formData.scheduledAt);
        toast.success(`Envio agendado para ${dataEHora(formData.scheduledAt)}`);
      } else {
        await campaignsService.startCampaign(campaign.id);
        toast.success(`Envio para ${clientes(recipientCount)} iniciado`);
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

  // As regras de "posso avançar?" vivem em `campanha/passosDaCampanha`, com
  // spec. Cada uma existe porque deixar passar faz a Meta recusar o disparo.
  const canProceed = (passo: PassoDaCampanha = currentStep) =>
    podeAvancar(passo, {
      temConta: Boolean(formData.accountId),
      tipo: formData.messageType,
      temTemplate: Boolean(formData.templateId),
      precisaDeProdutosDaOferta: needsOfferProducts,
      produtosEscolhidos: selectedOfferProducts.length,
      precisaDeImagemNoCabecalho: needsHeaderImage,
      temImagem: Boolean(selectedMediaFile) || Boolean(formData.mediaUrl),
      texto: formData.textContent,
      quantidadeDeContatos: formData.contacts.length,
    });

  const inserirNome = () =>
    setFormData(prev => ({
      ...prev,
      textContent: `${prev.textContent}${prev.textContent && !/\s$/.test(prev.textContent) ? ' ' : ''}{{nome}}`,
    }));

  // =============================================================================
  // RENDER
  // =============================================================================

  const voltarParaCampanhas = (
    <Button
      variant="ghost"
      onClick={() => navigate('/marketing/whatsapp')}
      aria-label="Voltar para campanhas WhatsApp"
      leftIcon={<ArrowLeftIcon className="h-4 w-4" aria-hidden />}
    >
      Voltar para campanhas
    </Button>
  );

  const casca = (conteudo: React.ReactNode) => (
    <PageShell
      trilha={[
        { rotulo: 'Campanhas', href: '/marketing' },
        { rotulo: 'WhatsApp', href: '/marketing/whatsapp' },
        { rotulo: 'Nova campanha' },
      ]}
      titulo="Nova campanha de WhatsApp"
      descricao="Escolha quem recebe, escreva a mensagem e veja como ela chega antes de enviar."
      acoes={voltarParaCampanhas}
    >
      {conteudo}
    </PageShell>
  );

  if (loading) {
    return casca(
      <div role="status" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <span className="sr-only">Carregando suas contas de WhatsApp…</span>
        <div aria-hidden className="superficie h-96 motion-safe:animate-pulse" />
        <div aria-hidden className="superficie h-80 motion-safe:animate-pulse" />
      </div>
    );
  }

  if (falhouContas) {
    return casca(
      <EmptyState
        icone={<DevicePhoneMobileIcon className="h-10 w-10 text-fg-muted-token" aria-hidden />}
        titulo="Não deu para carregar suas contas"
        descricao="A conexão falhou. Suas contas continuam lá."
        acao={
          <Button
            variant="outline"
            onClick={() => setTentativa((t) => t + 1)}
            leftIcon={<ArrowPathIcon className="h-4 w-4" aria-hidden />}
          >
            Tentar de novo
          </Button>
        }
      />
    );
  }

  if (accounts.length === 0) {
    return casca(
      <EmptyState
        icone={<DevicePhoneMobileIcon className="h-10 w-10 text-fg-muted-token" aria-hidden />}
        titulo="Nenhuma conta de WhatsApp"
        descricao="Conecte um número para criar campanhas."
        acao={<Button onClick={() => navigate('/accounts/new')}>Conectar número</Button>}
      />
    );
  }

  const remetente = selectedAccount?.name || storeName || 'Sua loja';
  const numeroDoRemetente = selectedAccount
    ? selectedAccount.display_phone_number || selectedAccount.phone_number
    : undefined;
  const tempo = tempoDeEnvio(recipientCount, formData.messagesPerMinute);

  const passoDaMensagem = (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold text-fg-token">Escreva a mensagem</h2>
        <p className="mt-1 text-body text-fg-muted-token">
          A prévia ao lado mostra como ela chega para o cliente.
        </p>
      </header>

      <ChoiceCards
        rotulo="Tipo de mensagem"
        opcoes={TIPOS_DE_MENSAGEM}
        valor={formData.messageType}
        onChange={(tipo) => setFormData(prev => ({ ...prev, messageType: tipo }))}
      />

      {/* Template */}
      {formData.messageType === 'template' && (
        loadingTemplates ? (
          <div className="flex items-center gap-2 py-6 text-body text-fg-muted-token">
            <Loading size="sm" rotulo="Carregando templates…" />
            <span aria-hidden>Carregando templates…</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="superficie flex flex-col items-center gap-2 p-6 text-center">
            <DocumentTextIcon className="h-8 w-8 text-fg-muted-token" aria-hidden />
            <p className="text-body font-medium text-fg-token">Nenhum template aprovado nesta conta</p>
            <p className="text-caption text-fg-muted-token">
              Aprovou um template agora na Meta? Sincronize para ele aparecer aqui.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              isLoading={syncingTemplates}
              onClick={handleSyncTemplates}
            >
              Sincronizar templates
            </Button>
          </div>
        ) : (
          <ChoiceCards
            rotulo="Template"
            descricao="Só aparecem os templates aprovados pela Meta."
            opcoes={templates.map((t) => ({
              valor: t.id,
              titulo: t.name,
              descricao: `${categoriaLegivel(t.category)} · ${t.language}`,
            }))}
            valor={formData.templateId}
            onChange={(id) => {
              const escolhido = templates.find((t) => t.id === id);
              if (escolhido) handleTemplateSelect(escolhido);
            }}
          />
        )
      )}

      {formData.messageType === 'template' && selectedTemplate && needsOfferProducts && (
        <section aria-labelledby="produtos-da-oferta" className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="produtos-da-oferta" className="text-body font-semibold text-fg-token">
                Produtos da oferta
              </h3>
              <p className="mt-0.5 text-caption text-fg-muted-token">
                Escolha 2 saladas. O preço é o que a loja cobra hoje.
              </p>
            </div>
            <span className="shrink-0 text-caption tabular-nums text-fg-muted-token" aria-live="polite">
              {selectedOfferProducts.length} de 2
            </span>
          </div>

          {!storeId ? (
            <p className="rounded-lg bg-warning-soft p-3 text-body text-warning-token">
              Escolha uma loja no topo do painel para carregar o cardápio.
            </p>
          ) : loadingProducts ? (
            <div className="flex items-center gap-2 py-6 text-body text-fg-muted-token">
              <Loading size="sm" rotulo="Carregando cardápio…" />
              <span aria-hidden>Carregando cardápio…</span>
            </div>
          ) : products.length === 0 ? (
            <p className="py-6 text-center text-body text-fg-muted-token">
              Nenhuma salada ativa em {storeName || 'esta loja'}.
            </p>
          ) : (
            <div className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto pr-1 max-md:grid-cols-1">
              {products.map(product => {
                const selectedIndex = selectedOfferProductIds.indexOf(product.id);
                const isSelected = selectedIndex >= 0;
                const compareAt = Number(product.compare_at_price || 0);
                const price = precoVigenteDoProduto(product);
                const hasDiscount = compareAt > price;

                return (
                  <button
                    key={product.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleToggleOfferProduct(product.id)}
                    className={cn(
                      'flex gap-3 rounded-lg border p-2.5 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                      isSelected
                        ? 'border-brand bg-brand-soft'
                        : 'border-border-token bg-surface hover:bg-surface-2',
                    )}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface-2">
                      {product.main_image_url ? (
                        <img
                          src={product.main_image_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <PhotoIcon className="m-4 h-6 w-6 text-fg-muted-token" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-body font-medium text-fg-token">{product.name}</p>
                        {isSelected && (
                          <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-badge font-semibold text-on-brand">
                            {selectedIndex + 1}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-caption text-fg-muted-token">
                        {product.category_name || 'Sem categoria'}
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        {hasDiscount && (
                          <span className="text-caption text-fg-muted-token line-through">
                            {formatCurrency(compareAt)}
                          </span>
                        )}
                        <span className="text-body font-semibold tabular-nums text-fg-token">
                          {formatCurrency(price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-caption text-fg-muted-token">
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
        </section>
      )}

      {formData.messageType === 'template' && selectedTemplate && needsHeaderImage && (
        <CampoDeImagem
          titulo="Imagem do template"
          descricao="Vai no cabeçalho do template aprovado."
          previaUrl={mediaPreviewUrl}
          nomeDoArquivo={formData.mediaFilename || selectedMediaFile?.name}
          onEscolher={handleEscolherImagem}
          onRemover={handleRemoverImagem}
          onInvalido={() => toast.error('Selecione uma imagem válida')}
        />
      )}

      {/* Texto livre */}
      {formData.messageType === 'text' && (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end justify-between gap-3">
              <label htmlFor="texto-da-campanha" className="text-sm font-medium text-fg-token">
                Mensagem
              </label>
              <Button variant="ghost" size="xs" onClick={inserirNome}>
                Inserir nome do cliente
              </Button>
            </div>
            <textarea
              id="texto-da-campanha"
              aria-describedby="texto-da-campanha-ajuda"
              value={formData.textContent}
              onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
              placeholder="Digite sua mensagem aqui..."
              rows={6}
              className="controle h-auto w-full resize-y py-2"
            />
            <p id="texto-da-campanha-ajuda" className="text-caption text-fg-muted-token">
              {'{{nome}}'} vira o nome de cada cliente. *Negrito* e _itálico_ funcionam como no WhatsApp.
            </p>
          </div>

          <CampoDeImagem
            titulo="Imagem (opcional)"
            descricao="Vai junto, com o texto como legenda."
            previaUrl={mediaPreviewUrl}
            nomeDoArquivo={formData.mediaFilename || selectedMediaFile?.name}
            onEscolher={handleEscolherImagem}
            onRemover={handleRemoverImagem}
            onInvalido={() => toast.error('Selecione uma imagem válida')}
          />
        </>
      )}
    </div>
  );

  const legendaDaPrevia = recipientCount > 0
    ? <>Exemplo com os dados de <span className="font-medium text-fg-token">{nomeDoExemplo}</span>, o primeiro da lista.</>
    : <>Exemplo com o nome {NOME_DE_EXEMPLO}. Adicione destinatários para ver com um cliente real.</>;

  const textoVazioDaPrevia = formData.messageType === 'template'
    ? 'Escolha um template. A mensagem aparece aqui.'
    : 'A mensagem aparece aqui enquanto você escreve.';

  return casca(
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Esquerda: o assistente.
            `overflow-clip` (e não `hidden`) arredonda o rodapé do stepper sem
            criar contêiner de rolagem — com `hidden`, o rodapé grudento
            deixaria de grudar na base da janela. */}
        <section aria-label="Passos da campanha" className="superficie min-w-0 overflow-clip px-6 pb-4 pt-5">
          <FormStepper
            passos={PASSOS_DO_ASSISTENTE}
            passoAtivo={currentStep}
            onMudarPasso={(id) => setCurrentStep(id as PassoDaCampanha)}
            podeAvancar={(id) => canProceed(id as PassoDaCampanha)}
            travarAvancar
            permitirPularAdiante={false}
            rotuloAvancar="Continuar"
            rotuloVoltar="Voltar"
            rotuloConcluir={rotuloDoEnvio(recipientCount)}
            varianteConcluir="success"
            iconeConcluir={<PaperAirplaneIcon className="h-4 w-4" aria-hidden />}
            concluindo={sending}
            rotuloConcluindo="Enviando…"
            onConcluir={() => handleSendCampaign(false)}
            acoesExtras={
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(true)}
                disabled={sending}
                leftIcon={<ClockIcon className="h-4 w-4" aria-hidden />}
              >
                Agendar envio
              </Button>
            }
          >
            {() => (
              <>
                {currentStep === 'account' && (
                  <PassoDaConta
                    accounts={accounts}
                    formData={formData}
                    handleAccountSelect={handleAccountSelect}
                  />
                )}

                {passosAbertos.has('recipients') && (
                  <div hidden={currentStep !== 'recipients'}>
                    <PassoDosDestinatarios
                      formData={formData}
                      setFormData={setFormData as never}
                      contactLists={contactLists}
                      newContact={newContact}
                      setNewContact={setNewContact}
                      storeSlug={storeSlug}
                      onAdicionarContato={handleAddContact}
                      onRemoverContato={handleRemoveContact}
                      onCarregarLista={handleLoadContactList}
                      onCarregarContatosDoSistema={handleLoadSystemContacts}
                      onUsarAudiencia={handleUsarAudiencia}
                      onAbrirImportacao={setShowImportModal}
                    />
                  </div>
                )}

                {passosAbertos.has('message') && (
                  <div hidden={currentStep !== 'message'}>{passoDaMensagem}</div>
                )}

                {currentStep === 'review' && (
                  <PassoDaRevisao
                    formData={formData}
                    setFormData={setFormData as never}
                    recipientCount={recipientCount}
                  />
                )}
              </>
            )}
          </FormStepper>
        </section>

        {/* Direita: o que o cliente recebe e os números do disparo. Fixa no
            desktop; no celular desce para depois do assistente. */}
        <aside aria-label="Prévia e resumo" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
          <BalaoDeWhatsApp
            remetente={remetente}
            detalheDoRemetente={numeroDoRemetente}
            texto={previa.corpo}
            cabecalho={previa.cabecalho}
            cabecalhoDeImagem={previa.cabecalhoDeImagem}
            imagemUrl={imagemDaPrevia}
            rodape={previa.rodape}
            botoes={previa.botoes}
            carregando={formData.messageType === 'template' && loadingTemplates}
            textoVazio={textoVazioDaPrevia}
            legenda={legendaDaPrevia}
          />

          {previa.semValor.length > 0 && (
            <p role="note" className="rounded-lg bg-warning-soft p-3 text-caption text-warning-token">
              O painel não preenche {previa.semValor.map((v) => `{{${v}}}`).join(', ')}. Confira o
              template antes de enviar.
            </p>
          )}

          <FormSummary
            titulo="Resumo do envio"
            estiloDoTitulo="titulo"
            linhas={[
              { rotulo: 'Recebem', valor: recipientCount > 0 ? clientes(recipientCount) : '' },
              {
                rotulo: 'Conta',
                valor: selectedAccount
                  ? [selectedAccount.name, numeroDoRemetente].filter(Boolean).join(' · ')
                  : '',
              },
              {
                rotulo: 'Mensagem',
                valor: formData.messageType === 'text'
                  ? 'Texto livre'
                  : selectedTemplate?.name ?? '',
              },
              {
                rotulo: 'Quando',
                valor: showScheduleModal && formData.scheduledAt
                  ? dataEHora(formData.scheduledAt)
                  : 'Agora',
              },
              { rotulo: 'Duração', valor: tempo },
            ]}
          />
        </aside>
      </div>

      {/* Agendar */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Agendar envio"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="horario-do-envio" className="mb-2 block text-sm font-medium text-fg-token">
              Data e hora
            </label>
            <input
              id="horario-do-envio"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              className="controle w-full"
            />
            {/* Quantos recebem de graça NESTE horário. Sem o número o dono
                agenda no escuro: "manda às 20h" pode ser 10 pessoas ou 2, e
                ele só descobre depois que a campanha rodou. */}
            {!horarioPermitido(formData.scheduledAt).ok && (
              <p role="alert" className="mt-2 text-caption text-danger-token">
                {horarioPermitido(formData.scheduledAt).motivo}
              </p>
            )}
            {janela && (
              <p className="mt-2 text-caption text-fg-muted-token">
                {avisoDaJanela(janela)}
              </p>
            )}
            {/* A campanha grátis não sai num bloco só: quem fecharia a janela
                de 24h antes do horário recebe antes. A linha mostra isso antes
                de o dono confirmar. */}
            {janela?.faixas?.length ? (
              <div className="mt-4">
                <LinhaDoDia faixas={janela.faixas} horarioDaCampanha={formData.scheduledAt} />
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowScheduleModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={() => handleSendCampaign(true)}
              disabled={sending || !formData.scheduledAt || !horarioPermitido(formData.scheduledAt).ok}
              leftIcon={<ClockIcon className="h-4 w-4" aria-hidden />}
            >
              {sending ? 'Agendando…' : 'Agendar envio'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Importar CSV */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar contatos de CSV"
      >
        <div className="space-y-4">
          <label htmlFor="csv-da-campanha" className="block text-body text-fg-muted-token">
            Cole o CSV abaixo: telefone,nome — um contato por linha.
          </label>
          <textarea
            id="csv-da-campanha"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="5511999999999,João Silva&#10;5511888888888,Maria Santos"
            rows={8}
            className="controle h-auto w-full py-2 font-mono text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowImportModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportCSV}>
              Importar contatos
            </Button>
          </div>
        </div>
      </Modal>

      {/* Escolher um a um */}
      <Modal
        isOpen={showSystemContactsModal}
        onClose={() => setShowSystemContactsModal(false)}
        title="Escolher contatos"
      >
        <div className="space-y-4">
          <p className="text-body text-fg-muted-token">
            Marque quem entra na campanha.
          </p>

          {loadingSystemContacts ? (
            <Loading size="md" rotulo="Carregando contatos…" className="py-8" />
          ) : systemContacts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <UserGroupIcon className="h-8 w-8 text-fg-muted-token" aria-hidden />
              <p className="text-body text-fg-muted-token">Nenhum contato no sistema ainda.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg bg-surface-2 p-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSystemContacts.size === systemContacts.length}
                    onChange={handleSelectAllSystemContacts}
                    className="h-4 w-4 rounded accent-brand"
                  />
                  <span className="font-medium text-fg-token">
                    Marcar todos ({systemContacts.length})
                  </span>
                </label>
                <span className="text-caption tabular-nums text-fg-muted-token">
                  {selectedSystemContacts.size} marcados
                </span>
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border-token p-2">
                {systemContacts.map((contact) => (
                  <label
                    key={contact.phone}
                    className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSystemContacts.has(contact.phone)}
                      onChange={() => handleToggleSystemContact(contact.phone)}
                      className="h-4 w-4 rounded accent-brand"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium tabular-nums text-fg-token">
                        {contact.phone}
                      </p>
                      {contact.name && (
                        <p className="truncate text-caption text-fg-muted-token">
                          {contact.name}
                        </p>
                      )}
                    </div>
                    {contact.source && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-badge text-fg-muted-token">
                        {ROTULO_DA_ORIGEM[contact.source] ?? contact.source}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowSystemContactsModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddSystemContacts}
              disabled={selectedSystemContacts.size === 0}
            >
              {selectedSystemContacts.size > 0
                ? `Adicionar ${selectedSystemContacts.size} ${selectedSystemContacts.size === 1 ? 'contato' : 'contatos'}`
                : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default NewWhatsAppCampaignPage;
