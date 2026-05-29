import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  DocumentTextIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { whatsappTemplates, WhatsAppTemplate } from '../../data/whatsappTemplates';
import { getErrorMessage, ordersService, productsService, whatsappService } from '../../services';
import { Product } from '../../services/products';
import { Order } from '../../types';

type Tab = 'templates' | 'tools';
type ToolId = 'route' | 'catalog' | 'order' | null;

interface ConversationRef {
  contact_name?: string;
  phone_number: string;
  account: string;
}

interface Props {
  accountId: string;
  storeId?: string;
  storeSlug?: string;
  storeName?: string;
  storeDescription?: string;
  storeAddress?: string;
  storeCity?: string;
  storeState?: string;
  storeUrl?: string;
  conversation: ConversationRef;
  onInsertText: (text: string) => void;
  onSendMessage: (text: string) => Promise<void>;
  onAfterSend?: () => void;
  onClose: () => void;
  defaultTab?: Tab;
}

interface OfficialTemplate {
  id: string;
  name: string;
  language?: string;
  category?: string;
  status?: string;
  components?: Array<Record<string, unknown>>;
}

function fillTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

const formatCurrency = (value: number | string | null | undefined) => {
  const numeric = typeof value === 'number' ? value : Number(value || 0);
  return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const truncate = (value: string, max: number) => {
  const clean = value.trim();
  return clean.length > max ? `${clean.slice(0, Math.max(0, max - 1)).trim()}…` : clean;
};

const getBodyTextFromComponents = (components?: Array<Record<string, unknown>>) => {
  const body = components?.find(c => String(c.type || '').toUpperCase() === 'BODY');
  return typeof body?.text === 'string' ? body.text : '';
};

const extractTemplateVariables = (content: string) => {
  const matches = content.match(/\{\{\d+\}\}/g) || [];
  return Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ''))));
};

const buildTemplateComponents = (variables: string[], values: Record<string, string>) => {
  if (variables.length === 0) return [];
  return [{
    type: 'body',
    parameters: variables.map(v => ({ type: 'text', text: values[v] || '-' })),
  }];
};

const compactLocation = (...parts: Array<string | null | undefined>) =>
  parts.map(part => part?.trim()).filter(Boolean).join(' | ');

// ─── Templates Tab ───────────────────────────────────────────────────────────

type TemplateCategory = 'all' | WhatsAppTemplate['category'];

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  all: 'Todos',
  transactional: 'Transacional',
  marketing: 'Marketing',
  support: 'Suporte',
};

function TemplatesTab({
  accountId,
  storeName,
  storeDescription,
  storeAddress,
  storeCity,
  storeState,
  storeUrl,
  conversation,
  onInsertText,
  onSendMessage,
  onAfterSend,
}: {
  accountId: string;
  storeName?: string;
  storeDescription?: string;
  storeAddress?: string;
  storeCity?: string;
  storeState?: string;
  storeUrl?: string;
  conversation: ConversationRef;
  onInsertText: (text: string) => void;
  onSendMessage: (text: string) => Promise<void>;
  onAfterSend?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [officialExpandedId, setOfficialExpandedId] = useState<string | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [officialTemplates, setOfficialTemplates] = useState<OfficialTemplate[]>([]);
  const [isLoadingOfficial, setIsLoadingOfficial] = useState(false);
  const storeLabel = storeName?.trim() || 'loja selecionada';
  const storeLocation = compactLocation(storeAddress, compactLocation(storeCity, storeState)) || 'atendimento local';
  const storeSpecialty = storeDescription?.trim() || 'produtos selecionados com carinho';
  const orderChannel = storeUrl?.trim()
    ? `Acesse: ${storeUrl.trim()}`
    : 'Pode fazer seu pedido por aqui mesmo no WhatsApp.';

  const getDefaultVar = (key: string) => {
    switch (key) {
      case 'nome':
      case 'customer_name':
      case 'first_name':
        return conversation.contact_name || '';
      case 'loja':
      case 'store_name':
        return storeLabel;
      case 'especialidade':
        return storeSpecialty;
      case 'localizacao':
        return storeLocation;
      case 'canal_pedido':
      case 'link':
      case 'store_url':
        return orderChannel;
      default:
        return '';
    }
  };

  useEffect(() => {
    if (!accountId) return;
    setIsLoadingOfficial(true);
    whatsappService.getTemplates(accountId)
      .then(response => {
        const data = response.data?.results || response.data || [];
        setOfficialTemplates(Array.isArray(data) ? data : []);
      })
      .catch(() => setOfficialTemplates([]))
      .finally(() => setIsLoadingOfficial(false));
  }, [accountId]);

  const filtered = useMemo(() => whatsappTemplates.filter(t => {
    const matchCat = category === 'all' || t.category === category;
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [search, category]);

  const expandedTemplate = expandedId ? whatsappTemplates.find(t => t.id === expandedId) : null;

  const handleExpand = (template: WhatsAppTemplate) => {
    if (expandedId === template.id) {
      setExpandedId(null);
      setVars({});
      return;
    }
    setExpandedId(template.id);
    const initial: Record<string, string> = {};
    template.variables.forEach(v => {
      initial[v] = getDefaultVar(v);
    });
    setVars(initial);
    setOfficialExpandedId(null);
  };

  const handleOfficialExpand = (template: OfficialTemplate) => {
    if (officialExpandedId === template.id) {
      setOfficialExpandedId(null);
      setVars({});
      return;
    }
    const body = getBodyTextFromComponents(template.components);
    const variables = extractTemplateVariables(body);
    const initial: Record<string, string> = {};
    variables.forEach(v => {
      initial[v] = v === '1' ? (conversation.contact_name || '') : '';
    });
    setOfficialExpandedId(template.id);
    setExpandedId(null);
    setVars(initial);
  };

  const filledContent = expandedTemplate
    ? fillTemplate(expandedTemplate.content, vars)
    : '';

  const officialTemplate = officialExpandedId
    ? officialTemplates.find(t => t.id === officialExpandedId)
    : null;
  const officialBody = getBodyTextFromComponents(officialTemplate?.components);
  const officialVariables = extractTemplateVariables(officialBody);
  const filledOfficialBody = officialVariables.reduce(
    (text, key) => text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), vars[key] || `{{${key}}}`),
    officialBody
  );

  const handleInsert = () => {
    onInsertText(filledContent);
    setExpandedId(null);
  };

  const handleSend = async () => {
    if (!filledContent.trim()) return;
    setSending(true);
    try {
      await onSendMessage(filledContent);
      setExpandedId(null);
    } finally {
      setSending(false);
    }
  };

  const handleSendOfficial = async () => {
    if (!officialTemplate || sending) return;
    setSending(true);
    try {
      await whatsappService.sendTemplate({
        account_id: accountId,
        to: conversation.phone_number,
        template_name: officialTemplate.name,
        language_code: officialTemplate.language || 'pt_BR',
        components: buildTemplateComponents(officialVariables, vars),
        metadata: {
          source: 'chat_window_templates',
          template_id: officialTemplate.id,
        },
      });
      toast.success('Template enviado');
      setOfficialExpandedId(null);
      onAfterSend?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tools-tab-content">
      <div className="tools-section-title">
        <span>Templates oficiais</span>
        <small>{isLoadingOfficial ? 'Carregando...' : `${officialTemplates.length} sincronizados`}</small>
      </div>

      <div className="templates-list">
        {officialTemplates.slice(0, 8).map(template => {
          const isExpanded = officialExpandedId === template.id;
          const body = getBodyTextFromComponents(template.components);
          const variables = extractTemplateVariables(body);
          return (
            <div key={template.id} className="template-card official">
              <button
                className={`template-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => handleOfficialExpand(template)}
              >
                <div className="template-info">
                  <span className="template-name">{template.name}</span>
                  <span className="template-desc">
                    {template.status || 'template'} · {template.language || 'pt_BR'} · {template.category || 'WhatsApp'}
                  </span>
                </div>
                {isExpanded
                  ? <ChevronUpIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  : <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />}
              </button>

              {isExpanded && (
                <div className="template-form">
                  <div className="template-preview">
                    {filledOfficialBody || 'Template sem corpo de texto no payload sincronizado.'}
                  </div>
                  {variables.length > 0 && (
                    <div className="template-vars">
                      {variables.map(v => (
                        <div key={v} className="template-var">
                          <label>Variável {v}</label>
                          <input
                            value={vars[v] || ''}
                            placeholder={`{{${v}}}`}
                            onChange={e => setVars(prev => ({ ...prev, [v]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    className="tp-btn tp-btn-primary w-full"
                    onClick={() => void handleSendOfficial()}
                    disabled={sending}
                  >
                    {sending ? 'Enviando...' : 'Enviar template oficial'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!isLoadingOfficial && officialTemplates.length === 0 && (
          <p className="tools-empty compact">Nenhum template oficial sincronizado nesta conta.</p>
        )}
      </div>

      <div className="tools-section-title">
        <span>Respostas rápidas</span>
        <small>editáveis antes de enviar</small>
      </div>

      <div className="tools-search">
        <MagnifyingGlassIcon className="w-4 h-4" />
        <input
          placeholder="Buscar template..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="tools-pills">
        {(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map(c => (
          <button
            key={c}
            className={`tool-pill ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="templates-list">
        {filtered.length === 0 && (
          <p className="tools-empty">Nenhum template encontrado</p>
        )}
        {filtered.map(template => {
          const isExpanded = expandedId === template.id;
          return (
            <div key={template.id} className="template-card">
              <button
                className={`template-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => handleExpand(template)}
              >
                <div className="template-info">
                  <span className="template-name">{template.name}</span>
                  <span className="template-desc">{template.description}</span>
                </div>
                {isExpanded
                  ? <ChevronUpIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  : <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />}
              </button>

              {isExpanded && (
                <div className="template-form">
                  <div className="template-preview">{filledContent}</div>

                  {template.variables.length > 0 && (
                    <div className="template-vars">
                      {template.variables.map(v => (
                        <div key={v} className="template-var">
                          <label>{v}</label>
                          <input
                            value={vars[v] || ''}
                            placeholder={`{{${v}}}`}
                            onChange={e => setVars(prev => ({ ...prev, [v]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="template-actions">
                    <button className="tp-btn tp-btn-secondary" onClick={handleInsert}>
                      Inserir no chat
                    </button>
                    <button
                      className="tp-btn tp-btn-primary"
                      onClick={handleSend}
                      disabled={sending}
                    >
                      {sending ? '...' : 'Enviar agora'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Route Tool ──────────────────────────────────────────────────────────────

function RouteTool({ storeSlug, onSendMessage }: { storeSlug?: string; onSendMessage: (text: string) => Promise<void> }) {
  const [address, setAddress] = useState('');
  const [quote, setQuote] = useState<{ fee?: number; distance_km?: number | null; duration_minutes?: number | null; message?: string } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [sending, setSending] = useState(false);

  const mapsUrl = address.trim()
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`
    : '';

  const handleCalculate = async () => {
    if (!address.trim() || !storeSlug || calculating) return;
    setCalculating(true);
    try {
      const data = await ordersService.calculateDeliveryFee(storeSlug, address.trim());
      setQuote(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setQuote(null);
    } finally {
      setCalculating(false);
    }
  };

  const handleSend = async () => {
    if (!address.trim() || sending) return;
    setSending(true);
    try {
      const quoteText = quote?.fee !== undefined
        ? `\n\n🚚 Taxa estimada: *${formatCurrency(quote.fee)}*${quote.distance_km ? `\n📏 Distância: ${Number(quote.distance_km).toFixed(1)} km` : ''}${quote.duration_minutes ? `\n⏱️ Tempo: ${Math.round(Number(quote.duration_minutes))} min` : ''}`
        : '';
      await onSendMessage(`📍 *Rota para entrega*\n${address.trim()}${quoteText}\n\n🗺️ Abrir no Google Maps:\n${mapsUrl}`);
      setAddress('');
      setQuote(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="quick-tool-body">
      <label className="tool-label">Endereço de destino</label>
      <input
        className="tool-input"
        value={address}
        onChange={e => setAddress(e.target.value)}
        placeholder="Ex: Rua das Flores, 123, Palmas-TO"
        onKeyDown={e => e.key === 'Enter' && void handleSend()}
      />
      {mapsUrl && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="tool-preview-link">
          🔗 Pré-visualizar rota
        </a>
      )}
      {storeSlug && (
        <button
          className="tp-btn tp-btn-secondary w-full"
          onClick={() => void handleCalculate()}
          disabled={!address.trim() || calculating}
        >
          {calculating ? 'Calculando...' : 'Calcular taxa'}
        </button>
      )}
      {quote && (
        <div className="tool-result">
          <strong>{formatCurrency(quote.fee || 0)}</strong>
          <span>{quote.message || 'Entrega calculada pelo backend'}</span>
        </div>
      )}
      <button
        className="tp-btn tp-btn-primary w-full"
        onClick={() => void handleSend()}
        disabled={!address.trim() || sending}
      >
        {sending ? 'Enviando...' : '🗺️ Calcular e Enviar Rota'}
      </button>
    </div>
  );
}

// ─── Catalog Tool ─────────────────────────────────────────────────────────────

function CatalogTool({ accountId, storeId, storeName, conversation, onSendMessage, onAfterSend }: {
  accountId: string;
  storeId?: string;
  storeName?: string;
  conversation: ConversationRef;
  onSendMessage: (text: string) => Promise<void>;
  onAfterSend?: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editing, setEditing] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setProducts([]);
    setSelectedCategory('all');
    setEditing(false);
    setLoadError(null);
    if (!storeId) return;
    setLoading(true);
    productsService.getProducts({ store: storeId, is_active: true, page_size: 50, ordering: 'category__name,name' })
      .then(data => setProducts(data.results || []))
      .catch(error => {
        setProducts([]);
        setLoadError(getErrorMessage(error));
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category_name || p.category || 'Outros'));
    return ['all', ...Array.from(set)];
  }, [products]);

  const visibleProducts = useMemo(() => (
    selectedCategory === 'all'
      ? products
      : products.filter(p => (p.category_name || p.category || 'Outros') === selectedCategory)
  ), [products, selectedCategory]);

  const catalogMessage = useMemo(() => {
    const title = storeName || 'Cardápio';
    const list = visibleProducts.slice(0, 12);
    if (!storeId) {
      return 'Selecione uma loja no painel para carregar o cardápio real antes de enviar.';
    }
    if (list.length === 0) {
      return `📋 *${title}*\n\nNenhum produto ativo encontrado para esta loja.`;
    }
    const lines = list.map(p => `• *${p.name}* — ${formatCurrency(p.price)}${p.description ? `\n  ${String(p.description).slice(0, 90)}` : ''}`);
    return `📋 *${title}*\n\n${lines.join('\n')}\n\nResponda com o nome do item ou toque nas opções do cardápio para escolher.`;
  }, [storeId, storeName, visibleProducts]);

  const handleEdit = () => {
    setCustomMsg(catalogMessage);
    setEditing(true);
  };

  const handleSend = async () => {
    if (!storeId || visibleProducts.length === 0) return;
    setSending(true);
    try {
      await onSendMessage(editing ? customMsg : catalogMessage);
      setEditing(false);
    } finally {
      setSending(false);
    }
  };

  const handleSendCatalog = async () => {
    if (!storeId) return;
    setSending(true);
    try {
      await whatsappService.sendCatalogMenu({
        account_id: accountId,
        to: conversation.phone_number,
        store_id: Number(storeId),
        metadata: { source: 'chat_window_catalog_native' },
      });
      toast.success('Catálogo WhatsApp enviado');
      onAfterSend?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="quick-tool-body">
      {!storeId && (
        <p className="tools-empty compact">Selecione a loja correta no painel para carregar o cardápio real.</p>
      )}
      {loadError && (
        <p className="tools-empty compact">Erro ao carregar produtos: {loadError}</p>
      )}
      <div className="catalog-tabs">
        {categories.map(c => (
          <button
            key={c}
            className={`catalog-tab ${selectedCategory === c ? 'active' : ''}`}
            onClick={() => { setSelectedCategory(c); setEditing(false); }}
          >
            {c === 'all' ? 'Todos' : c}
          </button>
        ))}
      </div>
      {loading && <p className="tools-empty compact">Carregando produtos...</p>}
      {!loading && storeId && products.length === 0 && (
        <p className="tools-empty compact">Nenhum produto ativo encontrado para esta loja.</p>
      )}

      <div className="catalog-preview">
        {editing ? (
          <textarea
            className="catalog-textarea"
            value={customMsg}
            onChange={e => setCustomMsg(e.target.value)}
            rows={10}
          />
        ) : (
          <pre className="catalog-text">{catalogMessage}</pre>
        )}
      </div>

      <button
        className="tp-btn tp-btn-secondary w-full"
        onClick={() => void handleSendCatalog()}
        disabled={!storeId || sending}
      >
        Enviar catálogo WhatsApp
      </button>

      <div className="tool-btn-row">
        <button
          className="tp-btn tp-btn-secondary"
          onClick={editing ? () => setEditing(false) : handleEdit}
        >
          {editing ? 'Cancelar' : '✏️ Editar'}
        </button>
        <button
          className="tp-btn tp-btn-primary"
          onClick={() => void handleSend()}
          disabled={!storeId || visibleProducts.length === 0 || sending}
        >
          {sending ? '...' : '📤 Enviar'}
        </button>
      </div>
    </div>
  );
}

// ─── Order Tool ───────────────────────────────────────────────────────────────

interface OrderItem {
  product_id?: string;
  name: string;
  qty: number;
  price: string;
}

function OrderTool({ conversation, storeId, storeSlug, onSendMessage }: {
  conversation: ConversationRef;
  storeId?: string;
  storeSlug?: string;
  onSendMessage: (text: string) => Promise<void>;
}) {
  const [items, setItems] = useState<OrderItem[]>([{ name: '', qty: 1, price: '' }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notes, setNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash'>('pix');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setItems([{ name: '', qty: 1, price: '' }]);
    setProducts([]);
    setLoadError(null);
    if (!storeId) return;
    setLoadingProducts(true);
    productsService.getProducts({ store: storeId, is_active: true, page_size: 80, ordering: 'name' })
      .then(data => setProducts(data.results || []))
      .catch(error => {
        setProducts([]);
        setLoadError(getErrorMessage(error));
      })
      .finally(() => setLoadingProducts(false));
  }, [storeId]);

  const addItem = () => setItems(prev => [...prev, { name: '', qty: 1, price: '' }]);

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: keyof OrderItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const selectProduct = (i: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setItems(prev => prev.map((item, idx) => idx === i ? {
      ...item,
      product_id: product.id,
      name: product.name,
      price: String(product.price),
    } : item));
  };

  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    return sum + price * item.qty;
  }, 0);

  const buildSummary = () => {
    const name = conversation.contact_name || conversation.phone_number;
    const lines: string[] = [`🛒 *Resumo do Pedido — ${name}*\n`];
    items.forEach(item => {
      if (!item.name.trim()) return;
      const price = parseFloat(item.price) || 0;
      const subtotal = price * item.qty;
      const priceStr = price > 0 ? ` — R$ ${subtotal.toFixed(2)}` : '';
      lines.push(`• ${item.qty}x ${item.name.trim()}${priceStr}`);
    });
    if (total > 0) lines.push(`\n💰 *Total: R$ ${total.toFixed(2)}*`);
    if (notes.trim()) lines.push(`📝 *Obs:* ${notes.trim()}`);
    return lines.join('\n');
  };

  const hasSelectedProducts = items.some(i => i.product_id);

  const handleSend = async () => {
    if (!storeId || !hasSelectedProducts || sending) return;
    setSending(true);
    try {
      await onSendMessage(buildSummary());
      setItems([{ name: '', qty: 1, price: '' }]);
      setNotes('');
    } finally {
      setSending(false);
    }
  };

  const handleCreateOrder = async () => {
    const validItems = items.filter(item => item.product_id && item.qty > 0);
    if (!storeId || !validItems.length || creating) return;
    setCreating(true);
    try {
      const order = await ordersService.createOrder({
        store: storeSlug || storeId,
        customer_name: conversation.contact_name || 'Cliente WhatsApp',
        customer_phone: onlyDigits(conversation.phone_number),
        customer_email: `${onlyDigits(conversation.phone_number) || 'cliente'}@whatsapp.chat`,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === 'delivery' ? deliveryAddress : undefined,
        payment_method: paymentMethod,
        items: validItems.map(item => ({ product_id: item.product_id!, quantity: item.qty })),
        notes,
      }) as Order;
      await onSendMessage(
        `✅ *Pedido criado no painel!*\n\nPedido: *#${order.order_number || order.id}*\nTotal: *${formatCurrency(order.total)}*\nPagamento: *${paymentMethod === 'pix' ? 'PIX' : 'Dinheiro'}*\n\nVou acompanhar por aqui.`
      );
      setItems([{ name: '', qty: 1, price: '' }]);
      setNotes('');
      setDeliveryAddress('');
      toast.success('Pedido criado');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="quick-tool-body order-tool">
      {!storeId && (
        <p className="tools-empty compact">Selecione uma loja para carregar produtos reais e criar pedido.</p>
      )}
      {loadingProducts && (
        <p className="tools-empty compact">Carregando produtos da loja...</p>
      )}
      {loadError && (
        <p className="tools-empty compact">Erro ao carregar produtos: {loadError}</p>
      )}
      {!loadingProducts && storeId && products.length === 0 && (
        <p className="tools-empty compact">Nenhum produto ativo encontrado para criar pedido nesta loja.</p>
      )}
      <div className="order-customer">
        <span className="tool-label">Cliente:</span>
        <span className="order-customer-name">
          {conversation.contact_name || conversation.phone_number}
        </span>
      </div>

      <div className="order-items">
        <div className="tool-label-row">
          <span className="tool-label">Itens</span>
          <button className="btn-add-item" onClick={addItem} disabled={!storeId || products.length === 0}>
            + Adicionar item
          </button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="order-item-row">
            <select
              className="item-name"
              value={item.product_id || ''}
              onChange={e => selectProduct(i, e.target.value)}
              disabled={!storeId || products.length === 0}
            >
              <option value="">Selecionar produto real</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} · {formatCurrency(product.price)}
                </option>
              ))}
            </select>
            <input
              className="item-qty"
              type="number"
              min={1}
              value={item.qty}
              disabled={!item.product_id}
              onChange={e => updateItem(i, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
            />
            <input
              className="item-price"
              placeholder="R$"
              value={item.price}
              readOnly
            />
            {items.length > 1 && (
              <button className="btn-remove-item" onClick={() => removeItem(i)}>×</button>
            )}
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="order-total">
          Total: <strong>R$ {total.toFixed(2)}</strong>
        </div>
      )}

      <div className="order-notes">
        <label className="tool-label">Observações</label>
        <input
          className="tool-input"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Sem cebola, entregar no portão..."
        />
      </div>

      <div className="segmented-row">
        <button className={`segment-btn ${deliveryMethod === 'pickup' ? 'active' : ''}`} onClick={() => setDeliveryMethod('pickup')}>Retirada</button>
        <button className={`segment-btn ${deliveryMethod === 'delivery' ? 'active' : ''}`} onClick={() => setDeliveryMethod('delivery')}>Entrega</button>
      </div>

      {deliveryMethod === 'delivery' && (
        <div className="order-notes">
          <label className="tool-label">Endereço</label>
          <input
            className="tool-input"
            value={deliveryAddress}
            onChange={e => setDeliveryAddress(e.target.value)}
            placeholder="Endereço de entrega"
          />
        </div>
      )}

      <div className="segmented-row">
        <button className={`segment-btn ${paymentMethod === 'pix' ? 'active' : ''}`} onClick={() => setPaymentMethod('pix')}>PIX</button>
        <button className={`segment-btn ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('cash')}>Dinheiro</button>
      </div>

      <button
        className="tp-btn tp-btn-secondary w-full"
        onClick={() => void handleSend()}
        disabled={!storeId || !hasSelectedProducts || sending}
      >
        {sending ? 'Enviando...' : 'Enviar resumo'}
      </button>
      <button
        className="tp-btn tp-btn-primary w-full"
        onClick={() => void handleCreateOrder()}
        disabled={!storeId || !hasSelectedProducts || creating || (deliveryMethod === 'delivery' && !deliveryAddress.trim())}
      >
        {creating ? 'Criando...' : 'Criar pedido no painel'}
      </button>
    </div>
  );
}

// ─── Tools Tab ────────────────────────────────────────────────────────────────

const TOOLS = [
  { id: 'route' as const,   icon: '🗺️', name: 'Calcular Rota',   desc: 'Gere e envie um link do Google Maps' },
  { id: 'catalog' as const, icon: '📋', name: 'Catálogo',        desc: 'Envie o cardápio para o cliente' },
  { id: 'order' as const,   icon: '🛒', name: 'Criar Pedido',    desc: 'Monte e envie um resumo de pedido' },
];

function ToolsTab({ accountId, conversation, storeId, storeSlug, storeName, onSendMessage, onAfterSend }: {
  accountId: string;
  conversation: ConversationRef;
  storeId?: string;
  storeSlug?: string;
  storeName?: string;
  onSendMessage: (text: string) => Promise<void>;
  onAfterSend?: () => void;
}) {
  const [activeTool, setActiveTool] = useState<ToolId>(null);

  const toggle = (id: ToolId) => setActiveTool(prev => prev === id ? null : id);

  return (
    <div className="tools-tab-content">
      {TOOLS.map(tool => {
        const isActive = activeTool === tool.id;
        return (
          <div key={tool.id} className={`quick-tool-card ${isActive ? 'active' : ''}`}>
            <button className="quick-tool-trigger" onClick={() => toggle(tool.id)}>
              <span className="tool-icon">{tool.icon}</span>
              <div className="tool-meta">
                <span className="tool-name">{tool.name}</span>
                <span className="tool-desc">{tool.desc}</span>
              </div>
              {isActive
                ? <ChevronUpIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                : <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />}
            </button>

            {isActive && tool.id === 'route' && (
              <RouteTool storeSlug={storeSlug} onSendMessage={onSendMessage} />
            )}
            {isActive && tool.id === 'catalog' && (
              <CatalogTool
                accountId={accountId}
                storeId={storeId}
                storeName={storeName}
                conversation={conversation}
                onSendMessage={onSendMessage}
                onAfterSend={onAfterSend}
              />
            )}
            {isActive && tool.id === 'order' && (
              <OrderTool
                conversation={conversation}
                storeId={storeId}
                storeSlug={storeSlug}
                onSendMessage={onSendMessage}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const ChatToolsPanel: React.FC<Props> = ({
  accountId,
  storeId,
  storeSlug,
  storeName,
  storeDescription,
  storeAddress,
  storeCity,
  storeState,
  storeUrl,
  conversation,
  onInsertText,
  onSendMessage,
  onAfterSend,
  onClose,
  defaultTab = 'templates',
}) => {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="chat-tools-panel">
      <div className="tools-panel-header">
        <div className="tools-panel-tabs">
          <button
            className={`tools-tab-btn ${tab === 'templates' ? 'active' : ''}`}
            onClick={() => setTab('templates')}
          >
            <DocumentTextIcon className="w-4 h-4" />
            Templates
          </button>
          <button
            className={`tools-tab-btn ${tab === 'tools' ? 'active' : ''}`}
            onClick={() => setTab('tools')}
          >
            <BoltIcon className="w-4 h-4" />
            Ferramentas
          </button>
        </div>
        <button className="tools-close-btn" onClick={onClose} title="Fechar painel">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="tools-panel-body">
        {tab === 'templates' ? (
          <TemplatesTab
            accountId={accountId}
            storeName={storeName}
            storeDescription={storeDescription}
            storeAddress={storeAddress}
            storeCity={storeCity}
            storeState={storeState}
            storeUrl={storeUrl}
            conversation={conversation}
            onInsertText={onInsertText}
            onSendMessage={onSendMessage}
            onAfterSend={onAfterSend}
          />
        ) : (
          <ToolsTab
            accountId={accountId}
            conversation={conversation}
            storeId={storeId}
            storeSlug={storeSlug}
            storeName={storeName}
            onSendMessage={onSendMessage}
            onAfterSend={onAfterSend}
          />
        )}
      </div>
    </div>
  );
};

export default ChatToolsPanel;
