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
    storesApi.getOrders({ store: storeId, search: phone, page_size: 1 })
      .then(res => {
        setLastOrder(res.results[0] ?? null);
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
                  ? <img src={profilePic} alt={conversation.contact_name} className="w-full h-full object-cover" crossOrigin="anonymous" />
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
