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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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

      // Wait briefly for the backend to create the conversation
      await new Promise(r => setTimeout(r, 800));
      const paginatedResult = await conversationsService.getConversations({ account: accountId, search: phoneDigits });
      const convs = paginatedResult.results ?? [];
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
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] transition-colors">
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
