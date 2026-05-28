/**
 * TemplateSelector — Seletor de templates WhatsApp
 *
 * Componente simples que lista templates aprovados via API ou usa fallback
 * hardcoded se o endpoint ainda não existir (backend pendente).
 *
 * Integração: adicione <TemplateSelector> como botão "Templates" na toolbar do chat.
 * Já existe implementação completa em ChatToolsPanel (aba "Templates") que usa
 * whatsappService.getTemplates(). Este componente é uma versão standalone
 * para uso fora do ChatToolsPanel.
 *
 * TODO backend: POST /stores/{slug}/whatsapp/send-template/ quando implementado.
 * Por ora, usa whatsappService.sendTemplate() que já existe.
 */
import React, { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { whatsappService, getErrorMessage } from '../../services';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TemplateVariable {
  index: string;
  defaultValue: string;
}

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  body: string;
  variables: TemplateVariable[];
  /** 'official' = via Meta API, 'local' = hardcoded fallback */
  source: 'official' | 'local';
  status?: string;
}

// Hardcoded fallback templates — usados quando a API não retorna dados
const FALLBACK_TEMPLATES: Template[] = [
  {
    id: 'fallback_boas_vindas',
    name: 'Boas-vindas',
    language: 'pt_BR',
    category: 'MARKETING',
    body: 'Olá {{1}}! Seja bem-vindo(a) ao {{2}}. Como posso ajudar você hoje?',
    variables: [
      { index: '1', defaultValue: '' },
      { index: '2', defaultValue: '' },
    ],
    source: 'local',
  },
  {
    id: 'fallback_confirmacao',
    name: 'Confirmação de Pedido',
    language: 'pt_BR',
    category: 'UTILITY',
    body: 'Seu pedido *#{{1}}* foi confirmado! Total: *R$ {{2}}*.\nEm breve entraremos em contato.',
    variables: [
      { index: '1', defaultValue: '' },
      { index: '2', defaultValue: '' },
    ],
    source: 'local',
  },
  {
    id: 'fallback_entrega',
    name: 'Pedido a Caminho',
    language: 'pt_BR',
    category: 'UTILITY',
    body: 'Seu pedido está a caminho! O entregador chegará em aproximadamente {{1}} minutos.',
    variables: [{ index: '1', defaultValue: '30' }],
    source: 'local',
  },
];

interface OfficialTemplate {
  id: string;
  name: string;
  language?: string;
  category?: string;
  status?: string;
  components?: Array<Record<string, unknown>>;
}

function getBodyFromComponents(components?: Array<Record<string, unknown>>): string {
  const body = components?.find((c) => String(c.type || '').toUpperCase() === 'BODY');
  return typeof body?.text === 'string' ? body.text : '';
}

function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{\d+\}\}/g) || [];
  return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ''))));
}

function applyVariables(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface TemplateSelectorProps {
  accountId: string;
  toPhone: string;
  contactName?: string;
  storeSlug?: string;
  onClose: () => void;
  onAfterSend?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  accountId,
  toPhone,
  contactName,
  onClose,
  onAfterSend,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  // Load official templates from API
  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    whatsappService
      .getTemplates(accountId)
      .then((response) => {
        const data: OfficialTemplate[] = response.data?.results || response.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped: Template[] = data.slice(0, 10).map((t) => {
            const body = getBodyFromComponents(t.components);
            const varKeys = extractVariables(body);
            return {
              id: t.id,
              name: t.name,
              language: t.language || 'pt_BR',
              category: t.category || 'UTILITY',
              body: body || '(sem corpo de texto)',
              variables: varKeys.map((k) => ({ index: k, defaultValue: k === '1' ? contactName || '' : '' })),
              source: 'official' as const,
              status: t.status,
            };
          });
          setTemplates(mapped);
        } else {
          // Fallback to hardcoded templates
          setTemplates(FALLBACK_TEMPLATES);
        }
      })
      .catch(() => {
        setTemplates(FALLBACK_TEMPLATES);
      })
      .finally(() => setLoading(false));
  }, [accountId, contactName]);

  const toggleExpand = (template: Template) => {
    if (expandedId === template.id) {
      setExpandedId(null);
      setVars({});
      return;
    }
    setExpandedId(template.id);
    // Pre-fill default values
    const initial: Record<string, string> = {};
    template.variables.forEach((v) => {
      initial[v.index] = v.defaultValue;
    });
    setVars(initial);
  };

  const handleSend = async (template: Template) => {
    if (sending) return;
    if (template.source === 'local') {
      toast.error('Templates locais são apenas preview — configure templates oficiais no Meta.');
      return;
    }
    setSending(true);
    try {
      const varKeys = template.variables.map((v) => v.index);
      const components =
        varKeys.length > 0
          ? [{ type: 'body', parameters: varKeys.map((k) => ({ type: 'text', text: vars[k] || '-' })) }]
          : [];
      await whatsappService.sendTemplate({
        account_id: accountId,
        to: toPhone,
        template_name: template.name,
        language_code: template.language,
        components,
        metadata: { source: 'template_selector', template_id: template.id },
      });
      toast.success('Template enviado com sucesso!');
      setExpandedId(null);
      onAfterSend?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const expandedTemplate = expandedId ? templates.find((t) => t.id === expandedId) : null;
  const previewBody = expandedTemplate
    ? applyVariables(expandedTemplate.body, vars)
    : '';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          Templates WhatsApp
        </p>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Templates list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Carregando templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Nenhum template disponível.
          </p>
        ) : (
          templates.map((template) => {
            const isExpanded = expandedId === template.id;
            return (
              <div
                key={template.id}
                className={`rounded-xl border transition-colors ${
                  isExpanded
                    ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
                    : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(template)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 truncate">
                      {template.name}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                      {template.category} · {template.language}
                      {template.source === 'local' && (
                        <span className="ml-1 text-yellow-600 dark:text-yellow-400">(preview local)</span>
                      )}
                      {template.status && (
                        <span className="ml-1 text-gray-400"> · {template.status}</span>
                      )}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUpIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {/* Expanded: preview + vars + send */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3">
                    {/* Preview */}
                    <div className="rounded-lg bg-gray-100 dark:bg-zinc-800 p-2.5">
                      <p className="text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">
                        {previewBody}
                      </p>
                    </div>

                    {/* Variable inputs */}
                    {template.variables.length > 0 && (
                      <div className="space-y-2">
                        {template.variables.map((v) => (
                          <div key={v.index}>
                            <label className="block text-[10px] font-semibold uppercase text-gray-400 dark:text-zinc-500 mb-1">
                              Variável {`{{${v.index}}}`}
                            </label>
                            <input
                              type="text"
                              value={vars[v.index] || ''}
                              onChange={(e) =>
                                setVars((prev) => ({
                                  ...prev,
                                  [v.index]: e.target.value,
                                }))
                              }
                              placeholder={`Valor para {{${v.index}}}`}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Send button */}
                    <button
                      type="button"
                      onClick={() => void handleSend(template)}
                      disabled={sending}
                      className="w-full py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                    >
                      {sending ? 'Enviando...' : 'Enviar template'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TemplateSelector;
