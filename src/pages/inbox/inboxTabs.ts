// Inbox unificado. Canais do produto = APENAS WhatsApp + Email; Instagram e
// Messenger foram retirados da superfície. Sobram as abas de operação: o canal
// WhatsApp e a visão unificada ("Todas").

export type InboxTabId = 'whatsapp' | 'conversas';

export interface InboxTab {
  id: InboxTabId;
  label: string;
}

const ALL_TAB_IDS: InboxTabId[] = ['whatsapp', 'conversas'];

export const INBOX_TABS: InboxTab[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'conversas', label: 'Todas' },
];

export const resolveInboxTab = (param: string | undefined | null): InboxTabId =>
  ALL_TAB_IDS.includes(param as InboxTabId) ? (param as InboxTabId) : 'whatsapp';

const LEGACY_MAP: Record<string, InboxTabId> = {
  '/whatsapp/inbox': 'whatsapp',
  '/whatsapp/chat': 'whatsapp',
  '/conversations': 'conversas',
  '/messages': 'conversas',
};

export const legacyPathToTab = (path: string): InboxTabId =>
  LEGACY_MAP[path] ?? 'whatsapp';
