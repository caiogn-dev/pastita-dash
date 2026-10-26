// Inbox unificado. Messenger segue fora da superfície do produto. O Instagram
// voltou, mas condicionado: a aba só aparece para a loja que conectou a conta
// — foi por aparecer para todo mundo e abrir vazia que ela saiu em agosto.
//
// 26/10: a aba "Todas" saiu. Era um segundo inbox para as mesmas conversas do
// WhatsApp — outra lista, outros botões (Resolver/Fechar/Reabrir moravam só
// lá) e outro jeito de responder. As ações foram para o cabeçalho do chat.

export type InboxTabId = 'whatsapp' | 'instagram';

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
];

/** As abas desta loja. O Instagram entra depois do WhatsApp. */
export function montarAbas({ temInstagram }: EstadoDosCanais = {}): InboxTab[] {
  return temInstagram ? [...INBOX_TABS, ABA_DO_INSTAGRAM] : INBOX_TABS;
}

export const resolveInboxTab = (
  param: string | undefined | null,
  canais: EstadoDosCanais = {},
): InboxTabId => {
  const permitidas = montarAbas(canais).map((t) => t.id);
  return permitidas.includes(param as InboxTabId) ? (param as InboxTabId) : 'whatsapp';
};

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
};

export const rolagemDaAba = (id: InboxTabId): DonoDaRolagem => ROLAGEM[id];
