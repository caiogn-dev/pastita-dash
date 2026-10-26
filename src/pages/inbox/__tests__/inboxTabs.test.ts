import { INBOX_TABS, resolveInboxTab } from '../inboxTabs';

describe('inboxTabs', () => {
  // 26/10: a aba "Todas" saiu — era um segundo inbox para as mesmas conversas
  // do WhatsApp, com outra lista, outros botões e outro jeito de responder.
  it('a aba fixa é só o WhatsApp', () => {
    expect(INBOX_TABS.map((t) => t.id)).toEqual(['whatsapp']);
  });

  it('resolveInboxTab: canal desconhecido (incl. a antiga "conversas") cai em whatsapp', () => {
    expect(resolveInboxTab('conversas')).toBe('whatsapp');
    expect(resolveInboxTab('instagram')).toBe('whatsapp');
    expect(resolveInboxTab('messenger')).toBe('whatsapp');
    expect(resolveInboxTab(undefined)).toBe('whatsapp');
    expect(resolveInboxTab('xyz')).toBe('whatsapp');
  });
});
