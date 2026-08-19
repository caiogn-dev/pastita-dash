import { classesDoInbox } from '../classesDoInbox';

describe('classe raiz do inbox', () => {
  it('sem conversa aberta, o celular mostra a lista', () => {
    expect(classesDoInbox(false)).toBe('whatsapp-inbox');
  });

  it('com conversa aberta, o celular mostra o chat', () => {
    expect(classesDoInbox(true)).toContain('whatsapp-inbox--conversa-aberta');
  });

  it('a classe base nunca some — é dela que vem a cadeia de altura', () => {
    expect(classesDoInbox(true)).toContain('whatsapp-inbox');
    expect(classesDoInbox(false)).toContain('whatsapp-inbox');
  });
});
