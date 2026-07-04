// Inbox unificado: 1 página com abas substitui as 7 rotas de chat antigas.

export type InboxTabId = 'whatsapp' | 'instagram' | 'messenger' | 'conversas';

export interface InboxTab {
  id: InboxTabId;
  label: string;
}

// Ids válidos para resolução de rota (todos continuam acessíveis por URL direta).
const ALL_TAB_IDS: InboxTabId[] = ['whatsapp', 'instagram', 'messenger', 'conversas'];

// Instagram/Messenger estão congelados: as abas ficam OCULTAS pra focar o inbox
// em WhatsApp + visão unificada. O conteúdo segue acessível por URL direta
// (/inbox/instagram, /inbox/messenger) via TAB_CONTENT — só não aparece como aba.
export const INBOX_TABS: InboxTab[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'conversas', label: 'Todas' },
];

export const resolveInboxTab = (param: string | undefined | null): InboxTabId =>
  ALL_TAB_IDS.includes(param as InboxTabId) ? (param as InboxTabId) : 'whatsapp';

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
