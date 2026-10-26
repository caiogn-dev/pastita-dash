import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  DocumentTextIcon,
  BoltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { getErrorMessage, ordersService, productsService, whatsappService } from '../../services';
import { Product } from '../../services/products';
import { parseCoords } from '../orders/newOrder/parseCoords';
import { estadoDoModelo, resumoDoModelo, textoDoModelo } from '../../utils/modelosDaMeta';
import { precoVigenteDoProduto } from '../../utils/precoVigente';
import { formatCurrency } from '../../utils/formatters';

type Tab = 'templates' | 'tools';
type ToolId = 'route' | 'catalog' | null;

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
  conversation: ConversationRef;
  onSendMessage: (text: string) => Promise<void>;
  onAfterSend?: () => void;
  onClose: () => void;
  defaultTab?: Tab;
}

interface ModeloDaMeta {
  id: string;
  name: string;
  language?: string;
  category?: string;
  status?: string;
  components?: Array<Record<string, unknown>>;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '');

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

// ─── Modelos ─────────────────────────────────────────────────────────────────
//
// 26/10: só os modelos da Meta. Os cinco textos fixos que moravam aqui
// (boas-vindas, cupom, aniversário…) não eram modelo nenhum — não furavam a
// janela de 24 h e duplicavam as Respostas rápidas. A linha de cada modelo
// dizia "APPROVED · pt_BR · MARKETING"; agora diz em português.

function ModelosTab({
  accountId,
  conversation,
  onAfterSend,
}: {
  accountId: string;
  conversation: ConversationRef;
  onAfterSend?: () => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [modelos, setModelos] = useState<ModeloDaMeta[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    setCarregando(true);
    whatsappService.getTemplates(accountId)
      .then(response => {
        const data = response.data?.results || response.data || [];
        setModelos(Array.isArray(data) ? data : []);
      })
      .catch(() => setModelos([]))
      .finally(() => setCarregando(false));
  }, [accountId]);

  const abrir = (modelo: ModeloDaMeta) => {
    if (aberto === modelo.id) {
      setAberto(null);
      setVars({});
      return;
    }
    const variables = extractTemplateVariables(textoDoModelo(modelo.components));
    const initial: Record<string, string> = {};
    variables.forEach(v => {
      initial[v] = v === '1' ? (conversation.contact_name || '') : '';
    });
    setAberto(modelo.id);
    setVars(initial);
  };

  const modelo = aberto ? modelos.find(t => t.id === aberto) : null;
  const corpo = textoDoModelo(modelo?.components);
  const variaveis = extractTemplateVariables(corpo);
  const corpoPreenchido = variaveis.reduce(
    (text, key) => text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), vars[key] || `{{${key}}}`),
    corpo
  );

  const enviar = async () => {
    if (!modelo || sending) return;
    setSending(true);
    try {
      await whatsappService.sendTemplate({
        account_id: accountId,
        to: conversation.phone_number,
        template_name: modelo.name,
        language_code: modelo.language || 'pt_BR',
        components: buildTemplateComponents(variaveis, vars),
        metadata: {
          source: 'chat_window_templates',
          template_id: modelo.id,
        },
      });
      toast.success('Modelo enviado');
      setAberto(null);
      onAfterSend?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tools-tab-content">
      <div className="templates-list">
        {modelos.map(m => {
          const isExpanded = aberto === m.id;
          const aprovado = estadoDoModelo(m.status).rotulo === 'Aprovado';
          return (
            <div key={m.id} className="template-card official">
              <button
                className={`template-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => abrir(m)}
              >
                <div className="template-info">
                  <span className="template-name">{m.name}</span>
                  <span className="template-desc">{resumoDoModelo(m)}</span>
                </div>
                {isExpanded
                  ? <ChevronUpIcon className="w-4 h-4 flex-shrink-0 text-fg-muted-token" />
                  : <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-fg-muted-token" />}
              </button>

              {isExpanded && (
                <div className="template-form">
                  {corpoPreenchido && <div className="template-preview">{corpoPreenchido}</div>}
                  {variaveis.length > 0 && (
                    <div className="template-vars">
                      {variaveis.map(v => (
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
                  {aprovado && (
                    <button
                      className="tp-btn tp-btn-primary w-full"
                      onClick={() => void enviar()}
                      disabled={sending}
                    >
                      {sending ? 'Enviando...' : 'Enviar modelo'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {carregando && <p className="tools-empty compact">Carregando…</p>}
        {!carregando && modelos.length === 0 && (
          <p className="tools-empty compact">Nenhum modelo nesta conta.</p>
        )}
      </div>
    </div>
  );
}

// ─── Route Tool ──────────────────────────────────────────────────────────────

function RouteTool({ storeSlug, conversation, onSendMessage }: { storeSlug?: string; conversation: ConversationRef; onSendMessage: (text: string) => Promise<void> }) {
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
      // Cola do link do Maps / "lat,lng" → calcula pelo pin (distância real).
      const data = await ordersService.calculateDeliveryFee(storeSlug, address.trim(), parseCoords(address));
      setQuote(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setQuote(null);
    } finally {
      setCalculating(false);
    }
  };

  const usarLocalizacao = async () => {
    if (!storeSlug || calculating) return;
    setCalculating(true);
    try {
      const loc = await ordersService.getSharedLocation(storeSlug, { phone: onlyDigits(conversation.phone_number) });
      if (!loc) { toast.error('Esse cliente não enviou localização no WhatsApp.'); return; }
      const label = (loc.address || '').trim() || `Localização enviada (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})`;
      setAddress(label);
      const data = await ordersService.calculateDeliveryFee(storeSlug, label, { lat: loc.lat, lng: loc.lng });
      setQuote(data);
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Erro ao puxar a localização');
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
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Erro ao enviar rota');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="quick-tool-body">
      <label className="tool-label">Endereço de destino</label>
      <button
        type="button"
        className="tp-btn tp-btn-secondary w-full"
        onClick={() => void usarLocalizacao()}
        disabled={calculating}
      >
        📍 {calculating ? 'Buscando...' : 'Usar localização enviada no WhatsApp'}
      </button>
      <input
        className="tool-input"
        value={address}
        onChange={e => setAddress(e.target.value)}
        placeholder="Endereço, ou cole o link do Google Maps do cliente"
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
    const lines = list.map(p => `• *${p.name}* — ${formatCurrency(precoVigenteDoProduto(p))}${p.description ? `\n  ${String(p.description).slice(0, 90)}` : ''}`);
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
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Erro ao enviar catálogo');
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

// ─── Tools Tab ────────────────────────────────────────────────────────────────

const TOOLS = [
  { id: 'route' as const,   icon: '🗺️', name: 'Calcular Rota',   desc: 'Gere e envie um link do Google Maps' },
  { id: 'catalog' as const, icon: '📋', name: 'Catálogo',        desc: 'Envie o cardápio para o cliente' },
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
                ? <ChevronUpIcon className="w-4 h-4 flex-shrink-0 text-fg-muted-token" />
                : <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-fg-muted-token" />}
            </button>

            {isActive && tool.id === 'route' && (
              <RouteTool storeSlug={storeSlug} conversation={conversation} onSendMessage={onSendMessage} />
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
  conversation,
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
            Modelos
          </button>
          <button
            className={`tools-tab-btn ${tab === 'tools' ? 'active' : ''}`}
            onClick={() => setTab('tools')}
          >
            <BoltIcon className="w-4 h-4" />
            Ferramentas
          </button>
        </div>
        <button aria-label="Fechar painel" className="tools-close-btn" onClick={onClose} title="Fechar painel">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="tools-panel-body">
        {tab === 'templates' ? (
          <ModelosTab
            accountId={accountId}
            conversation={conversation}
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
