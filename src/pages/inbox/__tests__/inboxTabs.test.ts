import { INBOX_TABS, resolveInboxTab, legacyPathToTab } from '../inboxTabs';

describe('inboxTabs', () => {
  it('abas do produto = WhatsApp + Todas (canais só WhatsApp+Email)', () => {
    expect(INBOX_TABS.map((t) => t.id)).toEqual(['whatsapp', 'conversas']);
  });

  it('resolveInboxTab: canal válido resolve; inválido/vazio (incl. legado IG/Messenger) cai em whatsapp', () => {
    expect(resolveInboxTab('conversas')).toBe('conversas');
    expect(resolveInboxTab('instagram')).toBe('whatsapp');
    expect(resolveInboxTab('messenger')).toBe('whatsapp');
    expect(resolveInboxTab(undefined)).toBe('whatsapp');
    expect(resolveInboxTab('xyz')).toBe('whatsapp');
  });

  it('legacyPathToTab mapeia as rotas antigas de chat', () => {
    expect(legacyPathToTab('/whatsapp/inbox')).toBe('whatsapp');
    expect(legacyPathToTab('/whatsapp/chat')).toBe('whatsapp');
    expect(legacyPathToTab('/conversations')).toBe('conversas');
    expect(legacyPathToTab('/messages')).toBe('conversas');
  });
});
