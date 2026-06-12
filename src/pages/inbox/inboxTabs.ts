// Inbox unificado: 1 página com abas substitui as 7 rotas de chat antigas.

export type InboxTabId = 'whatsapp' | 'instagram' | 'messenger' | 'conversas';

export interface InboxTab {
  id: InboxTabId;
  label: string;
}

export const INBOX_TABS: InboxTab[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'messenger', label: 'Messenger' },
  { id: 'conversas', label: 'Todas' },
];

export const resolveInboxTab = (param: string | undefined | null): InboxTabId => {
  const found = INBOX_TABS.find((t) => t.id === param);
  return found ? found.id : 'whatsapp';
};

const LEGACY_MAP: Record<string, InboxTabId> = {
  '/whatsapp/inbox': 'whatsapp',
  '/whatsapp/chat': 'whatsapp',
  '/instagram/inbox': 'instagram',
  '/messenger/inbox': 'messenger',
  '/conversations': 'conversas',
  '/messages': 'conversas',
};

export const legacyPathToTab = (path: string): InboxTabId =>
  LEGACY_MAP[path] ?? 'whatsapp';
