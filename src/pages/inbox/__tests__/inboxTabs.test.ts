import { INBOX_TABS, resolveInboxTab, legacyPathToTab } from '../inboxTabs';

describe('inboxTabs', () => {
  it('mostra só as abas de operação (whatsapp, conversas); IG/Messenger ocultos', () => {
    expect(INBOX_TABS.map((t) => t.id)).toEqual(['whatsapp', 'conversas']);
  });

  it('resolveInboxTab: IG/Messenger seguem resolvíveis por URL; inválido/vazio cai em whatsapp', () => {
    expect(resolveInboxTab('instagram')).toBe('instagram');
    expect(resolveInboxTab('messenger')).toBe('messenger');
    expect(resolveInboxTab('conversas')).toBe('conversas');
    expect(resolveInboxTab(undefined)).toBe('whatsapp');
    expect(resolveInboxTab('xyz')).toBe('whatsapp');
  });

  it('legacyPathToTab mapeia as rotas antigas', () => {
    expect(legacyPathToTab('/whatsapp/inbox')).toBe('whatsapp');
    expect(legacyPathToTab('/whatsapp/chat')).toBe('whatsapp');
    expect(legacyPathToTab('/instagram/inbox')).toBe('instagram');
    expect(legacyPathToTab('/messenger/inbox')).toBe('messenger');
    expect(legacyPathToTab('/conversations')).toBe('conversas');
    expect(legacyPathToTab('/messages')).toBe('conversas');
  });
});
