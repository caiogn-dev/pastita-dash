import { INBOX_TABS, resolveInboxTab, legacyPathToTab } from '../inboxTabs';

describe('inboxTabs', () => {
  it('tem as 4 abas na ordem: whatsapp, instagram, messenger, conversas', () => {
    expect(INBOX_TABS.map((t) => t.id)).toEqual(['whatsapp', 'instagram', 'messenger', 'conversas']);
  });

  it('resolveInboxTab: param válido retorna a aba, inválido/vazio cai em whatsapp', () => {
    expect(resolveInboxTab('instagram')).toBe('instagram');
    expect(resolveInboxTab('messenger')).toBe('messenger');
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
