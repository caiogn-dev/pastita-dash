# WhatsApp Chat Redesign — Plano de Implementação (Tier 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar `ChatWindow.tsx` (rota `/whatsapp/chat`) em um hub de 3 painéis premium: lista de conversas com filtros, chat central, e painel direito unificado (Info / Templates / Ferramentas) — além de criar o modal de nova conversa.

**Architecture:** Novos utilitários compartilhados (`avatar.ts`, `statusColors.ts`) e dois novos componentes (`ContactInfoPanel`, `NewConversationModal`) são criados antes de qualquer alteração no `ChatWindow`. O `ChatWindow` substitui todo CSS customizado por Tailwind usando os tokens do design system, refatora o estado interno e integra os novos componentes. O arquivo `WhatsAppInbox.css` permanece (ainda é importado por outros 3 arquivos) mas perde o import do ChatWindow ao final deste plano.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (tokens via CSS vars), date-fns ptBR, lucide-react / @heroicons/react, Zustand (chatStore), react-hot-toast, whatsappService, conversationsService, storesApi

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `src/utils/avatar.ts` |
| Criar | `src/utils/statusColors.ts` |
| Criar | `src/components/common/SkeletonLoader.tsx` |
| Criar | `src/components/chat/NewConversationModal.tsx` |
| Criar | `src/components/chat/ContactInfoPanel.tsx` |
| Modificar | `src/components/chat/ChatWindow.tsx` |
| Modificar | `src/pages/whatsapp/WhatsAppChatPage.tsx` |

---

## Task 1: Utilitários de Avatar e Status

**Files:**
- Create: `src/utils/avatar.ts`
- Create: `src/utils/statusColors.ts`
- Test: `src/utils/__tests__/avatar.test.ts`

- [ ] **Step 1.1: Escrever testes para `avatar.ts`**

```typescript
// src/utils/__tests__/avatar.test.ts
import { getAvatarColor, getInitials } from '../avatar';

describe('getAvatarColor', () => {
  it('retorna sempre uma string hex válida', () => {
    const color = getAvatarColor('João');
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
  it('retorna a mesma cor para o mesmo nome', () => {
    expect(getAvatarColor('Maria')).toBe(getAvatarColor('Maria'));
  });
  it('funciona com string vazia', () => {
    const color = getAvatarColor('');
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('getInitials', () => {
  it('extrai iniciais de nome completo', () => {
    expect(getInitials('João Silva')).toBe('JS');
  });
  it('limita a 2 caracteres', () => {
    expect(getInitials('Ana Paula Costa')).toBe('AP');
  });
  it('usa últimos 2 dígitos do telefone como fallback', () => {
    expect(getInitials(undefined, '11999990042')).toBe('42');
  });
  it('retorna ? quando sem nome e sem telefone', () => {
    expect(getInitials()).toBe('?');
  });
});
```

- [ ] **Step 1.2: Rodar testes para confirmar que falham**

```bash
cd /home/graco/WORK/pastita-dash && npx jest src/utils/__tests__/avatar.test.ts --no-coverage 2>&1 | tail -10
```
Expected: FAIL — "Cannot find module '../avatar'"

- [ ] **Step 1.3: Criar `src/utils/avatar.ts`**

```typescript
const PALETTE = [
  '#722F37', '#2563eb', '#16a34a', '#d97706',
  '#7c3aed', '#db2777', '#0891b2', '#65a30d',
];

export function getAvatarColor(name: string): string {
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length];
}

export function getInitials(name?: string, phone?: string): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return phone?.slice(-2) || '?';
}
```

- [ ] **Step 1.4: Rodar testes para confirmar que passam**

```bash
npx jest src/utils/__tests__/avatar.test.ts --no-coverage 2>&1 | tail -5
```
Expected: PASS — 6 testes

- [ ] **Step 1.5: Criar `src/utils/statusColors.ts`**

```typescript
export const ORDER_STATUS_COLOR: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  preparing:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  out_for_delivery: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  delivered:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  completed:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled:        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  failed:           'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ready:            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending:          'Pendente',
  confirmed:        'Confirmado',
  preparing:        'Preparando',
  out_for_delivery: 'Em entrega',
  delivered:        'Entregue',
  completed:        'Concluído',
  cancelled:        'Cancelado',
  failed:           'Falhou',
  ready:            'Pronto',
};
```

- [ ] **Step 1.6: Verificar TypeScript**

```bash
cd /home/graco/WORK/pastita-dash && npx tsc --noEmit 2>&1 | head -20
```
Expected: sem erros nos novos arquivos

- [ ] **Step 1.7: Commit**

```bash
git add src/utils/avatar.ts src/utils/statusColors.ts src/utils/__tests__/avatar.test.ts
git commit -m "feat: utilitários avatar e statusColors compartilhados"
```

---

## Task 2: SkeletonLoader

**Files:**
- Create: `src/components/common/SkeletonLoader.tsx`
- Modify: `src/components/common/index.ts` (adicionar export)

- [ ] **Step 2.1: Criar `src/components/common/SkeletonLoader.tsx`**

```tsx
import React from 'react';

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-3 p-4 ${className}`} aria-busy="true" aria-label="Carregando...">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-4 rounded-md animate-shimmer bg-gradient-to-r from-[var(--bg-hover,#f3f4f6)] via-[var(--bg-card,#fff)] to-[var(--bg-hover,#f3f4f6)] dark:from-[var(--dark-bg-hover,#161616)] dark:via-[var(--dark-bg-card,#1a1a1a)] dark:to-[var(--dark-bg-hover,#161616)] bg-[length:200%_100%]"
        style={{ width: `${[85, 65, 75][i % 3]}%` }}
      />
    ))}
  </div>
);
```

- [ ] **Step 2.2: Exportar do index de components/common**

Abrir `src/components/common/index.ts` e adicionar a linha:
```typescript
export { SkeletonLoader } from './SkeletonLoader';
```

- [ ] **Step 2.3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: sem erros

- [ ] **Step 2.4: Commit**

```bash
git add src/components/common/SkeletonLoader.tsx src/components/common/index.ts
git commit -m "feat: componente SkeletonLoader com shimmer animation"
```

---

## Task 3: NewConversationModal

**Files:**
- Create: `src/components/chat/NewConversationModal.tsx`

- [ ] **Step 3.1: Criar `src/components/chat/NewConversationModal.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { whatsappService, conversationsService, getErrorMessage } from '../../services';
import { MessageTemplate, Conversation } from '../../types';

interface NewConversationModalProps {
  accountId: string;
  onClose: () => void;
  onConversationCreated: (conv: Conversation) => void;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function extractTemplateText(template: MessageTemplate): string {
  const body = (template.components as Array<{ type: string; text?: string }>)
    ?.find(c => c.type === 'BODY');
  return body?.text || template.name;
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches)];
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  accountId, onClose, onConversationCreated,
}) => {
  const [phone, setPhone] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const phoneDigits = phone.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11;
  const templateText = selectedTemplate ? extractTemplateText(selectedTemplate) : '';
  const variableKeys = extractVariables(templateText);
  const allVarsFilled = variableKeys.every(v => variables[v]?.trim());
  const canSend = isPhoneValid && selectedTemplate !== null && (variableKeys.length === 0 || allVarsFilled);

  useEffect(() => {
    setIsLoading(true);
    whatsappService.getTemplates(accountId)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setTemplates(list.filter((t: MessageTemplate) => t.status === 'APPROVED'));
      })
      .catch(() => toast.error('Erro ao carregar templates'))
      .finally(() => setIsLoading(false));
  }, [accountId]);

  const handleSend = async () => {
    if (!canSend || !selectedTemplate) return;
    setIsSending(true);
    try {
      const to = `55${phoneDigits}`;
      const components = variableKeys.length > 0 ? [{
        type: 'body',
        parameters: variableKeys.map(v => ({ type: 'text', text: variables[v] })),
      }] : undefined;

      await whatsappService.sendTemplate({
        account_id: accountId,
        to,
        template_name: selectedTemplate.name,
        language_code: selectedTemplate.language,
        ...(components ? { components } : {}),
      });

      // Busca ou aguarda a conversa ser criada
      await new Promise(r => setTimeout(r, 800));
      const res = await conversationsService.getConversations({ account: accountId, search: phoneDigits });
      const convs = Array.isArray(res) ? res : (res?.results ?? []);
      const conv = convs.find((c: Conversation) => c.phone_number?.includes(phoneDigits));
      if (conv) {
        onConversationCreated(conv);
      } else {
        toast.success('Mensagem enviada! A conversa aparecerá em breve.');
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  const previewText = templateText
    ? variableKeys.reduce((t, v) => t.replace(new RegExp(`\\{\\{${v.replace('{{', '').replace('}}', '')}\\}\\}`, 'g'), variables[v] || `[${v}]`), templateText)
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[var(--bg-card,#fff)] dark:bg-[var(--dark-bg-card,#1a1a1a)] rounded-2xl shadow-2xl border border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)]">
            Nova Conversa
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] transition-colors">
            <XMarkIcon className="w-5 h-5 text-[var(--fg-secondary)]" />
          </button>
        </div>

        {/* Phone input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--fg-secondary)] dark:text-[var(--dark-text-secondary)] uppercase tracking-wider mb-1.5">
            Telefone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
            placeholder="(11) 99999-0000"
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-primary,#fff)] dark:bg-[var(--dark-bg-primary,#0D0907)] text-[var(--fg-primary)] dark:text-[var(--dark-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {phone && !isPhoneValid && (
            <p className="text-xs text-red-500 mt-1">Mínimo 10 dígitos</p>
          )}
        </div>

        {/* Template selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--fg-secondary)] dark:text-[var(--dark-text-secondary)] uppercase tracking-wider mb-1.5">
            Template (obrigatório)
          </label>
          {isLoading ? (
            <div className="text-sm text-[var(--fg-muted)] py-2">Carregando templates...</div>
          ) : (
            <select
              value={selectedTemplate?.id || ''}
              onChange={e => {
                const t = templates.find(t => t.id === e.target.value) || null;
                setSelectedTemplate(t);
                setVariables({});
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-primary,#fff)] dark:bg-[var(--dark-bg-primary,#0D0907)] text-[var(--fg-primary)] dark:text-[var(--dark-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione um template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
              ))}
            </select>
          )}
        </div>

        {/* Variable inputs */}
        {variableKeys.length > 0 && (
          <div className="mb-4 space-y-2">
            <label className="block text-xs font-semibold text-[var(--fg-secondary)] dark:text-[var(--dark-text-secondary)] uppercase tracking-wider">
              Variáveis
            </label>
            {variableKeys.map(v => (
              <input
                key={v}
                value={variables[v] || ''}
                onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                placeholder={`Variável ${v}`}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-primary,#fff)] dark:bg-[var(--dark-bg-primary,#0D0907)] text-[var(--fg-primary)] dark:text-[var(--dark-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            ))}
          </div>
        )}

        {/* Preview */}
        {previewText && (
          <div className="mb-5 p-3 rounded-xl bg-[#d9fdd3] dark:bg-[#005c4b] text-sm text-gray-800 dark:text-gray-100 italic">
            {previewText}
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend || isSending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          <PaperAirplaneIcon className="w-4 h-4" />
          {isSending ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 3.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "NewConversationModal\|avatar\|statusColors" | head -10
```
Expected: sem erros

- [ ] **Step 3.3: Commit**

```bash
git add src/components/chat/NewConversationModal.tsx
git commit -m "feat: modal para iniciar nova conversa via template WhatsApp"
```

---

## Task 4: ContactInfoPanel

**Files:**
- Create: `src/components/chat/ContactInfoPanel.tsx`

- [ ] **Step 4.1: Criar `src/components/chat/ContactInfoPanel.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Conversation } from '../../types';
import { ChatToolsPanel } from './ChatToolsPanel';
import { getAvatarColor, getInitials } from '../../utils/avatar';
import storesApi, { StoreOrder } from '../../services/storesApi';

type Tab = 'info' | 'templates' | 'tools';

interface ContactInfoPanelProps {
  conversation: Conversation;
  accountId: string;
  storeId?: string;
  storeSlug?: string;
  storeName?: string;
  storeDescription?: string;
  storeAddress?: string;
  storeCity?: string;
  storeState?: string;
  storeUrl?: string;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onClose: () => void;
  onInsertText: (text: string) => void;
  onSendMessage: (text: string) => Promise<void>;
  onAfterSend: () => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'templates', label: 'Templates' },
  { key: 'tools', label: 'Ferramentas' },
];

const NOTE_KEY = (convId: string) => `conv-note-${convId}`;

export const ContactInfoPanel: React.FC<ContactInfoPanelProps> = ({
  conversation, accountId, storeId, storeSlug, storeName,
  storeDescription, storeAddress, storeCity, storeState, storeUrl,
  activeTab, onTabChange, onClose, onInsertText, onSendMessage, onAfterSend,
}) => {
  const [lastOrder, setLastOrder] = useState<StoreOrder | null>(null);
  const [note, setNote] = useState(() => localStorage.getItem(NOTE_KEY(conversation.id)) || '');

  useEffect(() => {
    setNote(localStorage.getItem(NOTE_KEY(conversation.id)) || '');
  }, [conversation.id]);

  useEffect(() => {
    if (!storeId || activeTab !== 'info') return;
    const phone = conversation.phone_number.replace(/\D/g, '');
    // getOrders não tem customer_phone — usa `search` que filtra por telefone no backend
    storesApi.getOrders({ store: storeId, search: phone, page_size: 1 })
      .then(res => {
        const orders = Array.isArray(res) ? res : (res?.results ?? []);
        setLastOrder(orders[0] ?? null);
      })
      .catch(() => {/* silent fail */});
  }, [storeId, conversation.phone_number, activeTab]);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(conversation.phone_number);
    toast.success('Telefone copiado');
  };

  const handleNoteBlur = () => {
    localStorage.setItem(NOTE_KEY(conversation.id), note);
  };

  const avatarColor = getAvatarColor(conversation.contact_name || conversation.phone_number);
  const initials = getInitials(conversation.contact_name, conversation.phone_number);
  const profilePic = conversation.profile_picture || conversation.profile_picture_url;

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-card,#fff)] dark:bg-[var(--dark-bg-card,#1a1a1a)] overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)]">
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] transition-colors"
        >
          <XMarkIcon className="w-4 h-4 text-[var(--fg-secondary)]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' && (
          <div className="p-4 space-y-4">
            {/* Avatar + nome */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white overflow-hidden"
                style={{ backgroundColor: profilePic ? undefined : avatarColor }}
              >
                {profilePic
                  ? <img src={profilePic} alt={conversation.contact_name} className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--fg-primary)] dark:text-[var(--dark-text-primary,#FAF9F7)]">
                  {conversation.contact_name || 'Sem nome'}
                </p>
                <div className="flex items-center gap-1.5 justify-center mt-0.5">
                  <p className="text-sm text-[var(--fg-secondary)]">{conversation.phone_number}</p>
                  <button onClick={handleCopyPhone} title="Copiar telefone">
                    <ClipboardDocumentIcon className="w-3.5 h-3.5 text-[var(--fg-muted)] hover:text-primary-600 transition-colors" />
                  </button>
                </div>
              </div>
              {/* Modo */}
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                conversation.mode === 'human'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {conversation.mode === 'human' ? 'Humano' : 'Bot'}
              </span>
            </div>

            {/* Último pedido */}
            {storeId && (
              <div>
                <p className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest mb-2">
                  Último Pedido
                </p>
                {lastOrder ? (
                  <div className="rounded-xl border border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-[var(--fg-primary)] dark:text-[var(--dark-text-primary)]">
                        #{lastOrder.id}
                      </span>
                      <span className="font-semibold text-[var(--fg-primary)] dark:text-[var(--dark-text-primary)]">
                        R$ {Number(lastOrder.total).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--fg-secondary)] mt-0.5">
                      {format(new Date(lastOrder.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--fg-muted)] italic">Nenhum pedido encontrado</p>
                )}
              </div>
            )}

            {/* Nota rápida */}
            <div>
              <p className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest mb-2">
                Nota Rápida
              </p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Anotações sobre esse contato..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-primary,#fff)] dark:bg-[var(--dark-bg-primary,#0D0907)] text-sm text-[var(--fg-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--fg-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Link CRM */}
            {storeId && (
              <a
                href={`/stores/${storeId}/customers?phone=${conversation.phone_number.replace(/\D/g, '')}`}
                className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                Ver no CRM
              </a>
            )}
          </div>
        )}

        {(activeTab === 'templates' || activeTab === 'tools') && (
          <ChatToolsPanel
            key={activeTab}
            accountId={accountId}
            storeId={storeId}
            storeSlug={storeSlug}
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
            onClose={onClose}
            defaultTab={activeTab}
          />
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 4.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "ContactInfoPanel" | head -10
```
Expected: sem erros

- [ ] **Step 4.3: Commit**

```bash
git add src/components/chat/ContactInfoPanel.tsx
git commit -m "feat: ContactInfoPanel com tabs Info/Templates/Ferramentas"
```

---

## Task 5: ChatWindow — Refactor de Estado

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

Objetivo: substituir `activePanel` por `rightPanel`, adicionar `filter` e `showNewConvModal`, adicionar lógica de filtro de conversas, importar novos componentes.

- [ ] **Step 5.1: Substituir imports e estado no topo de `ChatWindow.tsx`**

Localizar e substituir o bloco de imports e as linhas de estado relevantes:

```diff
- import { ChatToolsPanel } from './ChatToolsPanel';
+ import { ChatToolsPanel } from './ChatToolsPanel';
+ import { ContactInfoPanel } from './ContactInfoPanel';
+ import { NewConversationModal } from './NewConversationModal';
+ import { getAvatarColor, getInitials } from '../../utils/avatar';
```

No import de `@heroicons/react/24/outline`, adicionar `PlusIcon` e `UserCircleIcon`:
```diff
- import { MagnifyingGlassIcon, DocumentTextIcon, BoltIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
+ import { MagnifyingGlassIcon, DocumentTextIcon, BoltIcon, EllipsisVerticalIcon, PlusIcon, UserCircleIcon } from '@heroicons/react/24/outline';
```

Substituir no bloco de estado (ao redor das linhas que declaram `activePanel`):
```diff
- const [activePanel, setActivePanel] = useState<'templates' | 'tools' | null>(null);
+ const [rightPanel, setRightPanel] = useState<'info' | 'templates' | 'tools' | null>(null);
+ const [showNewConvModal, setShowNewConvModal] = useState(false);
+ const [filter, setFilter] = useState<'all' | 'unread' | 'human' | 'bot'>('all');
```

- [ ] **Step 5.2: Substituir `filteredConversations` pela versão com filtro**

Localizar a linha:
```typescript
const filteredConversations = ensureArray<Conversation>(conversations);
```
Substituir por:
```typescript
const filteredConversations = ensureArray<Conversation>(conversations).filter(conv => {
  if (filter === 'unread') return (conv.unread_count ?? 0) > 0;
  if (filter === 'human') return conv.mode === 'human';
  if (filter === 'bot') return conv.mode !== 'human';
  return true;
});
```

- [ ] **Step 5.3: Substituir `togglePanel` e `handleInsertText` para nova nomenclatura**

Localizar:
```typescript
const togglePanel = (panel: 'templates' | 'tools') => {
  setActivePanel(prev => prev === panel ? null : panel);
};
```
Substituir por:
```typescript
const toggleRightPanel = (panel: 'info' | 'templates' | 'tools') => {
  setRightPanel(prev => prev === panel ? null : panel);
};
```

- [ ] **Step 5.4: Verificar TypeScript após mudança de estado**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Erros esperados: referências a `activePanel` e `togglePanel` que ainda não foram substituídas no JSX — serão corrigidas nas tasks seguintes.

- [ ] **Step 5.5: Commit parcial (estado)**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "refactor: ChatWindow — migra estado activePanel→rightPanel, adiciona filter e showNewConvModal"
```

---

## Task 6: ChatWindow — Painel Esquerdo (Tailwind)

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

Substituir o bloco JSX do painel esquerdo (div com `className="conversations-panel"`) pelo equivalente em Tailwind.

- [ ] **Step 6.1: Substituir o painel esquerdo inteiro no JSX do return**

Localizar a div:
```tsx
<div className="conversations-panel">
```
E substituir **todo o bloco** (até o `</div>` que fecha o painel, antes do `{/* ── Painel de Chat ── */}`) por:

```tsx
{/* ── Painel Esquerdo ── */}
<div className="w-80 flex-shrink-0 flex flex-col border-r border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-card,#fff)] dark:bg-[var(--dark-bg-card,#1a1a1a)]">
  {/* Header */}
  <div className="p-4 space-y-3 border-b border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)]">
    <div className="flex items-center justify-between">
      <h1 className="font-display text-lg font-bold text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)]">
        {accountName || 'WhatsApp'}
      </h1>
      <button
        onClick={() => setShowNewConvModal(true)}
        className="p-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
        title="Nova conversa"
      >
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
    {/* Search */}
    <div className="flex items-center gap-2 bg-[var(--bg-hover,#f9fafb)] dark:bg-[var(--dark-bg-hover,#161616)] rounded-lg px-3 py-2">
      <MagnifyingGlassIcon className="w-4 h-4 text-[var(--fg-muted,#9ca3af)] flex-shrink-0" />
      <input
        type="text"
        placeholder="Buscar conversa..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="flex-1 bg-transparent text-sm text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)] placeholder-[var(--fg-muted,#9ca3af)] outline-none"
      />
    </div>
    {/* Filter chips */}
    <div className="flex gap-1.5 flex-wrap">
      {(['all', 'unread', 'human', 'bot'] as const).map(f => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
            filter === f
              ? 'bg-primary-600 text-white'
              : 'bg-[var(--bg-hover,#f3f4f6)] dark:bg-[var(--dark-bg-hover,#161616)] text-[var(--fg-secondary,#6b7280)] dark:text-[var(--dark-text-secondary,#a1a1aa)] hover:bg-[var(--bg-card,#fff)] dark:hover:bg-[var(--dark-bg-card,#1a1a1a)]'
          }`}
        >
          {f === 'all' ? 'Todos' : f === 'unread' ? 'Não lidos' : f === 'human' ? 'Humano' : 'Bot'}
        </button>
      ))}
    </div>
  </div>

  {/* Lista */}
  <div className="flex-1 overflow-y-auto">
    {isLoadingConversations ? (
      <div className="p-4 space-y-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full animate-shimmer bg-gradient-to-r from-[var(--bg-hover,#f3f4f6)] via-[var(--bg-card,#fff)] to-[var(--bg-hover,#f3f4f6)] bg-[length:200%_100%] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded bg-gradient-to-r from-[var(--bg-hover,#f3f4f6)] via-[var(--bg-card,#fff)] to-[var(--bg-hover,#f3f4f6)] animate-shimmer bg-[length:200%_100%] w-3/4" />
              <div className="h-2.5 rounded bg-gradient-to-r from-[var(--bg-hover,#f3f4f6)] via-[var(--bg-card,#fff)] to-[var(--bg-hover,#f3f4f6)] animate-shimmer bg-[length:200%_100%] w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ) : filteredConversations.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-[var(--fg-muted,#9ca3af)] text-sm">
        <p>{searchTerm ? 'Nenhuma conversa encontrada' : filter !== 'all' ? 'Nenhuma conversa nesse filtro' : 'Nenhuma conversa'}</p>
      </div>
    ) : (
      filteredConversations.map(conv => {
        const isActive = selectedConversation?.id === conv.id;
        const avatarBg = getAvatarColor(conv.contact_name || conv.phone_number);
        const initials = getInitials(conv.contact_name, conv.phone_number);
        const profilePic = conv.profile_picture || conv.profile_picture_url;
        const timestamp = conv.last_message_at
          ? (() => {
              try {
                const d = new Date(conv.last_message_at);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
                if (diffDays === 0) return format(d, 'HH:mm');
                if (diffDays === 1) return 'Ontem';
                if (diffDays < 7) return format(d, 'EEE', { locale: ptBR });
                return format(d, 'dd/MM');
              } catch { return ''; }
            })()
          : '';
        return (
          <div
            key={conv.id}
            onClick={() => setSelectedConversation(conv)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
              isActive
                ? 'bg-primary-50 dark:bg-primary-950/20 border-l-2 border-primary-600'
                : 'hover:bg-[var(--bg-hover,#f9fafb)] dark:hover:bg-[var(--dark-bg-hover,#161616)] border-l-2 border-transparent'
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden"
                style={{ backgroundColor: profilePic ? undefined : avatarBg }}
              >
                {profilePic
                  ? <img src={profilePic} alt={conv.contact_name} className="w-full h-full object-cover" />
                  : initials}
              </div>
              {/* Mode dot */}
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-card,#fff)] dark:border-[var(--dark-bg-card,#1a1a1a)] ${
                conv.mode === 'human' ? 'bg-emerald-400' : 'bg-zinc-400'
              }`} />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)] truncate">
                {conv.contact_name || conv.phone_number}
              </p>
              <p className="text-xs text-[var(--fg-secondary,#6b7280)] dark:text-[var(--dark-text-secondary,#a1a1aa)] truncate mt-0.5">
                {typingContacts.has(conv.id) ? (
                  <span className="text-emerald-500 italic flex items-center gap-1">
                    <span className="flex gap-0.5 items-center">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                    digitando...
                  </span>
                ) : (conv.last_message_preview || conv.last_message || 'Sem mensagens')}
              </p>
            </div>
            {/* Meta */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {timestamp && (
                <span className="text-[10px] text-[var(--fg-muted,#9ca3af)]">{timestamp}</span>
              )}
              {(conv.unread_count ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 min-w-[18px] text-center bg-primary-600 text-white text-[10px] font-bold rounded-full">
                  {conv.unread_count}
                </span>
              )}
            </div>
          </div>
        );
      })
    )}
  </div>
</div>
```

- [ ] **Step 6.2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6.3: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "refactor: ChatWindow painel esquerdo migrado para Tailwind com filter chips e timestamps"
```

---

## Task 7: ChatWindow — Painel Central + Integração de Painéis

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

- [ ] **Step 7.1: Substituir o container raiz e o painel de chat no JSX**

Localizar `<div className="whatsapp-inbox">` e substituir por `<div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[var(--bg-primary,#fff)] dark:bg-[var(--dark-bg-primary,#0D0907)]">`.

Localizar `<div className={`chat-panel ${activePanel ? 'panel-open' : ''}`}>` e substituir por:
```tsx
<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
```

- [ ] **Step 7.2: Substituir o chat header**

Localizar `<div className="chat-header">` e substituir **o bloco inteiro do header** por:

```tsx
<div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-card,#fff)] dark:bg-[var(--dark-bg-card,#1a1a1a)] flex-shrink-0">
  {/* Avatar clicável → abre Info */}
  <button
    onClick={() => toggleRightPanel('info')}
    className="relative flex-shrink-0"
    title="Ver info do contato"
  >
    {(() => {
      const pic = selectedConversation.profile_picture || selectedConversation.profile_picture_url;
      const bg = getAvatarColor(selectedConversation.contact_name || selectedConversation.phone_number);
      const ini = getInitials(selectedConversation.contact_name, selectedConversation.phone_number);
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden" style={{ backgroundColor: pic ? undefined : bg }}>
          {pic ? <img src={pic} alt={selectedConversation.contact_name} className="w-full h-full object-cover" /> : ini}
        </div>
      );
    })()}
  </button>
  {/* Info */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-semibold text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)] truncate">
      {selectedConversation.contact_name || selectedConversation.phone_number}
    </p>
    <p className="text-xs text-[var(--fg-secondary,#6b7280)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">
      {typingContacts.has(selectedConversation.id) ? (
        <span className="text-emerald-500 flex items-center gap-1">
          <span className="flex gap-0.5">
            {[0,1,2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
          digitando...
        </span>
      ) : selectedConversation.phone_number}
    </p>
  </div>
  {/* Ações */}
  <div className="flex items-center gap-1.5 flex-shrink-0">
    {/* Pill modo */}
    <button
      onClick={handleSwitchMode}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${
        selectedConversation.mode === 'human'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
          : 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
      }`}
      title={selectedConversation.mode === 'human' ? 'Mudar para Bot' : 'Mudar para Humano'}
    >
      {selectedConversation.mode === 'human' ? '👤 Humano' : '🤖 Bot'}
    </button>
    {/* Botão Info — usa UserCircleIcon (adicionar ao import de @heroicons/react/24/outline) */}
    <button
      onClick={() => toggleRightPanel('info')}
      className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'info' ? 'bg-primary-600 text-white' : 'hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] text-[var(--fg-secondary)]'}`}
      title="Info do contato"
    >
      <UserCircleIcon className="w-4 h-4" />
    </button>
    {/* Botão Templates */}
    <button
      onClick={() => toggleRightPanel('templates')}
      className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'templates' ? 'bg-primary-600 text-white' : 'hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] text-[var(--fg-secondary)]'}`}
      title="Templates"
    >
      <DocumentTextIcon className="w-4 h-4" />
    </button>
    {/* Botão Ferramentas */}
    <button
      onClick={() => toggleRightPanel('tools')}
      className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'tools' ? 'bg-primary-600 text-white' : 'hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] text-[var(--fg-secondary)]'}`}
      title="Ferramentas"
    >
      <BoltIcon className="w-4 h-4" />
    </button>
    {/* Reload */}
    <button
      className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] transition-colors"
      onClick={loadMessages}
      disabled={isLoadingMessages}
      title="Recarregar mensagens"
    >
      <EllipsisVerticalIcon className="w-4 h-4 text-[var(--fg-secondary)]" />
    </button>
  </div>
</div>
```

- [ ] **Step 7.3: Substituir `messages-container` e `no-conversation-selected` por Tailwind**

Localizar `className="messages-container"` e substituir por:
```tsx
className="flex-1 overflow-y-auto p-4 bg-[#f0ebe3] dark:bg-[#0d0907]"
```

Localizar `className="no-conversation-selected"` e substituir por:
```tsx
className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--fg-muted,#9ca3af)] bg-[#f0ebe3] dark:bg-[#0d0907]"
```

Localizar `className="messages-empty"` e substituir por:
```tsx
className="flex flex-col items-center justify-center h-full gap-2 text-[var(--fg-muted,#9ca3af)] text-sm"
```

Localizar `className="messages-list"` e substituir por:
```tsx
className="flex flex-col gap-1"
```

- [ ] **Step 7.4: Substituir o date separator inline styles por Tailwind**

Localizar o bloco do date separator:
```tsx
<div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
  <span style={{ padding: '0.2rem 0.75rem', background: 'rgba(255,255,255,0.8)', borderRadius: '20px', fontSize: '0.75rem', color: '#6b7280', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
```
Substituir por:
```tsx
<div className="flex justify-center my-2">
  <span className="px-3 py-0.5 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-full text-xs text-[var(--fg-secondary,#6b7280)] shadow-sm">
```

- [ ] **Step 7.5: Substituir o bloco do painel direito**

Localizar `{/* ── Painel de Ferramentas ── */}` e substituir **o bloco inteiro** por:

```tsx
{/* ── Painel Direito ── */}
{selectedConversation && rightPanel && (
  <ContactInfoPanel
    conversation={selectedConversation}
    accountId={accountId}
    storeId={storeId || undefined}
    storeSlug={storeSlug || undefined}
    storeName={storeName || undefined}
    storeDescription={store?.description || undefined}
    storeAddress={store?.address || undefined}
    storeCity={store?.city || undefined}
    storeState={store?.state || undefined}
    storeUrl={getStoreUrl(store?.metadata)}
    activeTab={rightPanel}
    onTabChange={setRightPanel}
    onClose={() => setRightPanel(null)}
    onInsertText={handleInsertText}
    onSendMessage={handleToolsSend}
    onAfterSend={() => void loadMessages()}
  />
)}
```

- [ ] **Step 7.6: Adicionar modal de nova conversa ao JSX (após o `{mediaViewer && ...}`)**

```tsx
{showNewConvModal && (
  <NewConversationModal
    accountId={accountId}
    onClose={() => setShowNewConvModal(false)}
    onConversationCreated={(conv) => {
      setConversations(prev => {
        const exists = prev.some(c => c.id === conv.id);
        return exists ? prev : [conv, ...prev];
      });
      setSelectedConversation(conv);
      setShowNewConvModal(false);
    }}
  />
)}
```

- [ ] **Step 7.7: Remover import do WhatsAppInbox.css de ChatWindow.tsx**

Localizar e remover:
```typescript
import '../../pages/whatsapp/WhatsAppInbox.css';
```

- [ ] **Step 7.8: Verificar TypeScript — zero erros esperados**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Se houver erros de `togglePanel` ainda sendo referenciado, substituir qualquer chamada restante para `toggleRightPanel`.

- [ ] **Step 7.9: Build de verificação**

```bash
npm run build 2>&1 | tail -20
```
Expected: Build succeeded

- [ ] **Step 7.10: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "refactor: ChatWindow painel central e direito migrados para Tailwind + integra ContactInfoPanel e NewConversationModal"
```

---

## Task 8: WhatsAppChatPage — Suporte a Query Param `?phone`

**Files:**
- Modify: `src/pages/whatsapp/WhatsAppChatPage.tsx`

Permite que a página CRM (`/stores/:id/customers`) envie o usuário para `/whatsapp/chat?phone=XXXXX` e o chat pré-selecione ou crie a conversa.

- [ ] **Step 8.1: Adicionar lógica de query param em `WhatsAppChatPage.tsx`**

Substituir o conteúdo completo do arquivo por:

```tsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAccountStore } from '../../stores/accountStore';
import { Button } from '../../components/common';
import { Conversation } from '../../types';

export const WhatsAppChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phoneFromUrl = searchParams.get('phone')?.replace(/\D/g, '') || null;
  const { accounts, selectedAccount, setSelectedAccount } = useAccountStore();

  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0]);
    }
  }, [selectedAccount, accounts, setSelectedAccount]);

  if (!selectedAccount) {
    return (
      <div className="p-4 h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">WhatsApp Chat</h1>
        <p className="text-[var(--fg-secondary)]">Nenhuma conta selecionada</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/accounts')}>Ver Contas</Button>
          <Button onClick={() => navigate('/accounts/new')} variant="outline">Nova Conta</Button>
        </div>
      </div>
    );
  }

  const handleConversationSelect = (conv: Conversation | null) => {
    // Remove o query param após selecionar para não poluir a URL
    if (conv && phoneFromUrl) {
      navigate('/whatsapp/chat', { replace: true });
    }
  };

  return (
    <div className="h-[calc(100vh-56px)]">
      <ChatWindow
        accountId={selectedAccount.id}
        accountName={selectedAccount.name}
        initialPhone={phoneFromUrl || undefined}
        onConversationSelect={handleConversationSelect}
      />
    </div>
  );
};

export default WhatsAppChatPage;
```

- [ ] **Step 8.2: Adicionar `initialPhone` prop ao `ChatWindow`**

Em `src/components/chat/ChatWindow.tsx`, no interface `ChatWindowProps`, adicionar:
```typescript
initialPhone?: string;
```

No corpo do componente, adicionar após o `useEffect` de `loadConversations`:
```typescript
// Pré-seleciona conversa se `initialPhone` foi passado via URL
useEffect(() => {
  if (!initialPhone || conversations.length === 0) return;
  const match = conversations.find(c =>
    c.phone_number.replace(/\D/g, '').includes(initialPhone) ||
    initialPhone.includes(c.phone_number.replace(/\D/g, ''))
  );
  if (match) setSelectedConversation(match);
}, [initialPhone, conversations]);
```

- [ ] **Step 8.3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```
Expected: sem erros

- [ ] **Step 8.4: Commit**

```bash
git add src/pages/whatsapp/WhatsAppChatPage.tsx src/components/chat/ChatWindow.tsx
git commit -m "feat: WhatsAppChatPage suporta ?phone= para pré-selecionar conversa via CRM"
```

---

## Task 9: Teste Visual e Limpeza

- [ ] **Step 9.1: Iniciar dev server**

```bash
npm run dev
```

- [ ] **Step 9.2: Verificar WhatsApp Chat — painel esquerdo**
  - Abrir `http://localhost:5173/whatsapp/chat`
  - Confirmar: lista carrega com shimmer → conversas aparecem com avatar colorido, timestamp, badge unread
  - Confirmar: filter chips "Todos / Não lidos / Humano / Bot" filtram a lista
  - Confirmar: botão `+` abre o `NewConversationModal`

- [ ] **Step 9.3: Verificar WhatsApp Chat — painel central**
  - Selecionar uma conversa
  - Confirmar: header com avatar, nome, pill modo, botões ícones
  - Confirmar: fundo das mensagens é `#f0ebe3` (light) / `#0d0907` (dark)
  - Confirmar: date separators com estilo backdrop-blur
  - Confirmar: `MessageInput` funciona (send, file attach)
  - Confirmar: envio de mensagem aparece otimisticamente

- [ ] **Step 9.4: Verificar painel direito**
  - Clicar no avatar do contato → painel direito abre na tab Info
  - Confirmar: foto/initials, nome, telefone, botão copiar
  - Clicar em Templates → `ChatToolsPanel` renderiza na tab templates
  - Clicar em Ferramentas → `ChatToolsPanel` renderiza na tab tools
  - Fechar com X → painel fecha

- [ ] **Step 9.5: Verificar dark mode**
  - Ativar dark mode via toggle na navbar
  - Confirmar: todos os painéis usam os tokens dark corretamente (sem fundo branco hardcoded)

- [ ] **Step 9.6: Verificar que `WhatsAppInbox.css` ainda funciona para outros arquivos**
  - Abrir `/conversations`, `/whatsapp/inbox`, `/instagram/inbox`, `/messenger/inbox`
  - Confirmar: ainda funcionam visualmente (ainda importam o CSS)

- [ ] **Step 9.7: Verificar Sidebar morta e deletar**

```bash
grep -rn "Sidebar" /home/graco/WORK/pastita-dash/src/ | grep -v ".css\|//\|Sidebar.tsx" | head -5
```
Se output vazio (nenhuma importação real), deletar:
```bash
rm src/components/layout/Sidebar.tsx
git add -A
git commit -m "chore: remove Sidebar.tsx (componente morto nunca importado)"
```

- [ ] **Step 9.8: Commit final de ajustes**

```bash
git add -A
git commit -m "fix: ajustes visuais pós-revisão do WhatsApp Chat redesign"
```

---

## Checklist de Spec Coverage

| Requisito do spec | Task |
|---|---|
| 3 painéis (esquerdo, chat, direito) | Tasks 5-7 |
| Filter chips All/Unread/Human/Bot | Task 5-6 |
| Timestamps em conversas | Task 6 |
| Avatar colorido determinístico | Task 1 + 6 |
| Mode dot no avatar | Task 6 |
| FAB + modal nova conversa | Task 3 + 7 |
| ContactInfoPanel (Info/Templates/Ferramentas) | Task 4 + 7 |
| Typing dots animation | Task 6 + 7 |
| Pill modo no header | Task 7 |
| Avatar clicável → abre Info | Task 7 |
| Nota rápida em localStorage | Task 4 |
| Último pedido na tab Info | Task 4 |
| Link "Ver no CRM" | Task 4 |
| Migração CSS → Tailwind (ChatWindow) | Tasks 6-7 |
| Query param ?phone | Task 8 |
| getAvatarColor + getInitials utils | Task 1 |
| statusColors util | Task 1 |
| SkeletonLoader | Task 2 |
| Dark mode com tokens CSS vars | Tasks 3-8 |
| Sidebar.tsx deletado | Task 9 |
