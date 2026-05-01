import React, { useState, useMemo } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { whatsappTemplates, WhatsAppTemplate } from '../../data/whatsappTemplates';

type Tab = 'templates' | 'tools';
type ToolId = 'route' | 'catalog' | 'order' | null;

interface ConversationRef {
  contact_name?: string;
  phone_number: string;
  account: string;
}

interface Props {
  conversation: ConversationRef;
  onInsertText: (text: string) => void;
  onSendMessage: (text: string) => Promise<void>;
  onClose: () => void;
  defaultTab?: Tab;
}

function fillTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

// ─── Templates Tab ───────────────────────────────────────────────────────────

type TemplateCategory = 'all' | WhatsAppTemplate['category'];

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  all: 'Todos',
  transactional: 'Transacional',
  marketing: 'Marketing',
  support: 'Suporte',
};

function TemplatesTab({ conversation, onInsertText, onSendMessage }: {
  conversation: ConversationRef;
  onInsertText: (text: string) => void;
  onSendMessage: (text: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

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
      initial[v] = v === 'nome' ? (conversation.contact_name || '') : '';
    });
    setVars(initial);
  };

  const filledContent = expandedTemplate
    ? fillTemplate(expandedTemplate.content, vars)
    : '';

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

  return (
    <div className="tools-tab-content">
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

function RouteTool({ onSendMessage }: { onSendMessage: (text: string) => Promise<void> }) {
  const [address, setAddress] = useState('');
  const [sending, setSending] = useState(false);

  const mapsUrl = address.trim()
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`
    : '';

  const handleSend = async () => {
    if (!address.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(
        `📍 *Rota calculada para:*\n${address.trim()}\n\n🗺️ Abra no Google Maps:\n${mapsUrl}`
      );
      setAddress('');
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

const CATALOGS = [
  {
    id: 'saladas',
    label: '🥗 Cê Saladas',
    message: `🥗 *CARDÁPIO — Cê Saladas*

*Saladas Especiais:*
• Caesar Clássica — R$ 32,00
• Grega Tradicional — R$ 28,00
• Tropical com Frango — R$ 35,00
• Caprese com Burrata — R$ 42,00

*Bowls Proteicos:*
• Bowl Grão & Proteína — R$ 38,00
• Bowl Mediterrâneo — R$ 36,00

*Adicionais:*
• Proteína extra — R$ 8,00
• Molho especial — R$ 5,00

🚚 Entrega grátis acima de R$ 80,00
📱 Peça agora pelo WhatsApp!`,
  },
  {
    id: 'massas',
    label: '🍝 Pastita',
    message: `🍝 *CARDÁPIO — Pastita Massas Artesanais*

*Massas Frescas:*
• Fettuccine ao Molho Branco — R$ 34,00
• Penne ao Pesto — R$ 32,00
• Tagliatelle Bolonhesa — R$ 36,00
• Gnocchi ao Sugo — R$ 30,00
• Ravioli de Ricota — R$ 38,00

*Combos:*
• Massa + Salada + Bebida — R$ 45,00

📍 Palmas/TO | ⏰ Ter–Dom 11h–21h
🛵 Delivery | 🏠 Retire no local

Faça seu pedido! 👆`,
  },
];

function CatalogTool({ onSendMessage }: { onSendMessage: (text: string) => Promise<void> }) {
  const [selectedId, setSelectedId] = useState(CATALOGS[0].id);
  const [editing, setEditing] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [sending, setSending] = useState(false);

  const catalog = CATALOGS.find(c => c.id === selectedId)!;

  const handleSelectCatalog = (id: string) => {
    setSelectedId(id);
    setEditing(false);
  };

  const handleEdit = () => {
    setCustomMsg(catalog.message);
    setEditing(true);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await onSendMessage(editing ? customMsg : catalog.message);
      setEditing(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="quick-tool-body">
      <div className="catalog-tabs">
        {CATALOGS.map(c => (
          <button
            key={c.id}
            className={`catalog-tab ${selectedId === c.id ? 'active' : ''}`}
            onClick={() => handleSelectCatalog(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="catalog-preview">
        {editing ? (
          <textarea
            className="catalog-textarea"
            value={customMsg}
            onChange={e => setCustomMsg(e.target.value)}
            rows={10}
          />
        ) : (
          <pre className="catalog-text">{catalog.message}</pre>
        )}
      </div>

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
          disabled={sending}
        >
          {sending ? '...' : '📤 Enviar'}
        </button>
      </div>
    </div>
  );
}

// ─── Order Tool ───────────────────────────────────────────────────────────────

interface OrderItem {
  name: string;
  qty: number;
  price: string;
}

function OrderTool({ conversation, onSendMessage }: {
  conversation: ConversationRef;
  onSendMessage: (text: string) => Promise<void>;
}) {
  const [items, setItems] = useState<OrderItem[]>([{ name: '', qty: 1, price: '' }]);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const addItem = () => setItems(prev => [...prev, { name: '', qty: 1, price: '' }]);

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: keyof OrderItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

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

  const hasItems = items.some(i => i.name.trim());

  const handleSend = async () => {
    if (!hasItems || sending) return;
    setSending(true);
    try {
      await onSendMessage(buildSummary());
      setItems([{ name: '', qty: 1, price: '' }]);
      setNotes('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="quick-tool-body order-tool">
      <div className="order-customer">
        <span className="tool-label">Cliente:</span>
        <span className="order-customer-name">
          {conversation.contact_name || conversation.phone_number}
        </span>
      </div>

      <div className="order-items">
        <div className="tool-label-row">
          <span className="tool-label">Itens</span>
          <button className="btn-add-item" onClick={addItem}>+ Adicionar item</button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="order-item-row">
            <input
              className="item-name"
              placeholder="Item"
              value={item.name}
              onChange={e => updateItem(i, 'name', e.target.value)}
            />
            <input
              className="item-qty"
              type="number"
              min={1}
              value={item.qty}
              onChange={e => updateItem(i, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
            />
            <input
              className="item-price"
              placeholder="R$"
              value={item.price}
              onChange={e => updateItem(i, 'price', e.target.value)}
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

      <button
        className="tp-btn tp-btn-primary w-full"
        onClick={() => void handleSend()}
        disabled={!hasItems || sending}
      >
        {sending ? 'Enviando...' : '📤 Enviar Resumo do Pedido'}
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

function ToolsTab({ conversation, onSendMessage }: {
  conversation: ConversationRef;
  onSendMessage: (text: string) => Promise<void>;
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
              <RouteTool onSendMessage={onSendMessage} />
            )}
            {isActive && tool.id === 'catalog' && (
              <CatalogTool onSendMessage={onSendMessage} />
            )}
            {isActive && tool.id === 'order' && (
              <OrderTool conversation={conversation} onSendMessage={onSendMessage} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const ChatToolsPanel: React.FC<Props> = ({
  conversation,
  onInsertText,
  onSendMessage,
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
            conversation={conversation}
            onInsertText={onInsertText}
            onSendMessage={onSendMessage}
          />
        ) : (
          <ToolsTab
            conversation={conversation}
            onSendMessage={onSendMessage}
          />
        )}
      </div>
    </div>
  );
};

export default ChatToolsPanel;
