import { copyToClipboard } from '../../utils/clipboard';
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

  const handleCopyPhone = async () => {
    const ok = await copyToClipboard(conversation.phone_number);
    if (ok) toast.success('Telefone copiado');
    else toast.error('Não foi possível copiar. Copie manualmente.');
  };

  const handleNoteBlur = () => {
    localStorage.setItem(NOTE_KEY(conversation.id), note);
  };

  const avatarColor = getAvatarColor(conversation.contact_name || conversation.phone_number);
  const initials = getInitials(conversation.contact_name, conversation.phone_number);
  const profilePic = conversation.profile_picture || conversation.profile_picture_url;

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-border-token bg-surface overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-token">
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'text-fg-muted-token hover:bg-surface-2'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
          aria-label="Fechar painel de contato"
        >
          <XMarkIcon className="w-4 h-4 text-fg-muted-token" />
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
                  ? <img src={profilePic} alt={conversation.contact_name} className="w-full h-full object-cover" loading="lazy" decoding="async" crossOrigin="anonymous" />
                  : initials}
              </div>
              <div className="text-center">
                <p className="font-semibold text-fg-token">
                  {conversation.contact_name || 'Sem nome'}
                </p>
                <div className="flex items-center gap-1.5 justify-center mt-0.5">
                  <p className="text-sm text-fg-muted-token">{conversation.phone_number}</p>
                  <button onClick={handleCopyPhone} title="Copiar telefone" aria-label="Copiar telefone">
                    <ClipboardDocumentIcon className="w-3.5 h-3.5 text-fg-muted-token hover:text-primary-600 transition-colors" />
                  </button>
                </div>
              </div>
              {/* Modo */}
              <span className={`px-2.5 py-0.5 rounded-full text-badge font-semibold ${
                conversation.mode === 'human'
                  ? 'bg-success-soft text-success-token'
                  : 'bg-surface-2 text-fg-muted-token'
              }`}>
                {conversation.mode === 'human' ? 'Humano' : 'Bot'}
              </span>
            </div>

            {/* Último pedido */}
            {storeId && (
              <div>
                <p className="overline mb-2">
                  Último Pedido
                </p>
                {lastOrder ? (
                  <div className="rounded-xl border border-border-token p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-fg-token">
                        #{lastOrder.id}
                      </span>
                      <span className="font-semibold text-fg-token">
                        R$ {Number(lastOrder.total).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted-token mt-0.5">
                      {format(new Date(lastOrder.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-fg-muted-token italic">Nenhum pedido encontrado</p>
                )}
              </div>
            )}

            {/* Nota rápida */}
            <div>
              <p className="overline mb-2">
                Nota Rápida
              </p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Anotações sobre esse contato..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-border-token bg-surface text-sm text-fg-token placeholder-fg-muted-token resize-none focus:outline-none focus:ring-2 focus:ring-brand"
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
