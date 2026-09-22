// Inbox unificado. Messenger segue fora da superfície do produto. O Instagram
// voltou, mas condicionado: a aba só aparece para a loja que conectou a conta
// — foi por aparecer para todo mundo e abrir vazia que ela saiu em agosto.

export type InboxTabId = 'whatsapp' | 'instagram' | 'conversas';

export interface EstadoDosCanais {
  temInstagram?: boolean;
}

export interface InboxTab {
  id: InboxTabId;
  label: string;
}

const ABA_DO_INSTAGRAM: InboxTab = { id: 'instagram', label: 'Direct' };

export const INBOX_TABS: InboxTab[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'conversas', label: 'Todas' },
];

/** As abas desta loja. O Instagram entra depois do WhatsApp e antes de "Todas". */
export function montarAbas({ temInstagram }: EstadoDosCanais = {}): InboxTab[] {
  if (!temInstagram) return INBOX_TABS;
  return [INBOX_TABS[0], ABA_DO_INSTAGRAM, INBOX_TABS[1]];
}

export const resolveInboxTab = (
  param: string | undefined | null,
  canais: EstadoDosCanais = {},
): InboxTabId => {
  const permitidas = montarAbas(canais).map((t) => t.id);
  return permitidas.includes(param as InboxTabId) ? (param as InboxTabId) : 'whatsapp';
};

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
  // O direct é um chat de altura fixa, igual ao WhatsApp: rola por dentro.
  instagram: 'propria',
  conversas: 'wrapper',
};

export const rolagemDaAba = (id: InboxTabId): DonoDaRolagem => ROLAGEM[id];
