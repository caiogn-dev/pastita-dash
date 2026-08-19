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

/**
 * Quem é dono da rolagem de cada aba.
 *
 * - `propria`: a aba é um shell de altura fixa e rola por dentro (WhatsApp Web).
 *   O wrapper precisa ser `overflow-hidden`, senão o chat inteiro — mensagens
 *   MAIS o campo de digitar — vira conteúdo de uma página comprida: a lista de
 *   conversas sai da tela e só dá para escrever rolando até o fim.
 * - `wrapper`: a aba é uma página de altura natural e precisa que o wrapper
 *   role, senão fica cortada sem rolagem nenhuma.
 */
export type DonoDaRolagem = 'propria' | 'wrapper';

const ROLAGEM: Record<InboxTabId, DonoDaRolagem> = {
  whatsapp: 'propria',
  conversas: 'wrapper',
};

export const rolagemDaAba = (id: InboxTabId): DonoDaRolagem => ROLAGEM[id];
