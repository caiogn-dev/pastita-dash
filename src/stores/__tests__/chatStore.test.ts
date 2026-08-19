import { useChatStore } from '../chatStore';
import type { Conversation } from '../../types';

const conv = (id: string, lastMessageAt: string | undefined, unread = 0): Conversation =>
  ({
    id,
    account: 'acc-1',
    phone_number: `+55639999${id}`,
    contact_name: `Contato ${id}`,
    status: 'active',
    mode: 'auto',
    unread_count: unread,
    last_message_at: lastMessageAt,
  } as unknown as Conversation);

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  describe('ordenação por última mensagem', () => {
    it('setConversations ordena por last_message_at desc', () => {
      useChatStore.getState().setConversations([
        conv('a', '2026-07-27T10:00:00Z'),
        conv('b', '2026-07-29T10:00:00Z'),
        conv('c', '2026-07-28T10:00:00Z'),
      ]);
      expect(useChatStore.getState().conversations.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    });

    it('updateConversation com nova last_message_at sobe a conversa pro topo', () => {
      useChatStore.getState().setConversations([
        conv('a', '2026-07-29T10:00:00Z'),
        conv('b', '2026-07-28T10:00:00Z'),
      ]);
      useChatStore.getState().updateConversation({ id: 'b', last_message_at: '2026-07-29T12:00:00Z' });
      expect(useChatStore.getState().conversations[0].id).toBe('b');
    });

    it('addConversation insere ordenado, não apenas no início', () => {
      useChatStore.getState().setConversations([conv('a', '2026-07-29T10:00:00Z')]);
      useChatStore.getState().addConversation(conv('b', '2026-07-28T10:00:00Z'));
      expect(useChatStore.getState().conversations.map((c) => c.id)).toEqual(['a', 'b']);
    });
  });

  describe('upsertConversation', () => {
    it('atualiza conversa existente e reordena', () => {
      useChatStore.getState().setConversations([
        conv('a', '2026-07-29T10:00:00Z'),
        conv('b', '2026-07-28T10:00:00Z'),
      ]);
      useChatStore.getState().upsertConversation(conv('b', '2026-07-30T10:00:00Z', 2));
      const state = useChatStore.getState();
      expect(state.conversations[0].id).toBe('b');
      expect(state.conversations[0].unread_count).toBe(2);
      expect(state.conversations).toHaveLength(2);
    });

    it('adiciona conversa nova quando não existe', () => {
      useChatStore.getState().setConversations([conv('a', '2026-07-28T10:00:00Z')]);
      useChatStore.getState().upsertConversation(conv('nova', '2026-07-29T10:00:00Z', 1));
      const state = useChatStore.getState();
      expect(state.conversations).toHaveLength(2);
      expect(state.conversations[0].id).toBe('nova');
      expect(state.totalUnreadCount).toBe(1);
    });
  });

  describe('prependMessages (scroll infinito)', () => {
    const msg = (id: string) => ({ id, direction: 'inbound', created_at: '2026-07-29T10:00:00Z' } as never);

    it('insere mensagens antigas no início preservando as atuais', () => {
      useChatStore.getState().setMessages('conv-1', [msg('c'), msg('d')]);
      useChatStore.getState().prependMessages('conv-1', [msg('a'), msg('b')]);
      expect(useChatStore.getState().getConversationMessages('conv-1').map((m) => m.id)).toEqual([
        'a', 'b', 'c', 'd',
      ]);
    });

    it('deduplica por id', () => {
      useChatStore.getState().setMessages('conv-1', [msg('b'), msg('c')]);
      useChatStore.getState().prependMessages('conv-1', [msg('a'), msg('b')]);
      expect(useChatStore.getState().getConversationMessages('conv-1').map((m) => m.id)).toEqual([
        'a', 'b', 'c',
      ]);
    });
  });

  describe('leitura', () => {
    it('markConversationAsRead zera unread e ajusta total', () => {
      useChatStore.getState().setConversations([
        conv('a', '2026-07-29T10:00:00Z', 3),
        conv('b', '2026-07-28T10:00:00Z', 2),
      ]);
      useChatStore.getState().markConversationAsRead('a');
      const state = useChatStore.getState();
      expect(state.conversations.find((c) => c.id === 'a')?.unread_count).toBe(0);
      expect(state.totalUnreadCount).toBe(2);
    });
  });
});

describe('teto do cache de mensagens', () => {
  /**
   * `messagesCache` é um objeto por conversa e nada nunca removia entrada.
   * Num turno de trabalho o atendente abre dezenas de conversas; cada uma
   * guardava até 100 mensagens por página carregada, para sempre. O painel ia
   * ficando pesado ao longo do dia sem nenhum sintoma óbvio de causa.
   *
   * Guardamos apenas as conversas abertas mais recentemente. Reabrir uma
   * conversa despejada só refaz o fetch — barato e previsível.
   */
  const msg = (id: string) => ({ id, content: id, created_at: '2026-08-19T10:00:00Z' } as never);

  beforeEach(() => {
    useChatStore.setState({ messagesCache: {} } as never);
  });

  it('guarda as conversas abertas recentemente', () => {
    const s = useChatStore.getState();
    s.setMessages('c1', [msg('m1')]);
    s.setMessages('c2', [msg('m2')]);
    const cache = useChatStore.getState().messagesCache;
    expect(Object.keys(cache).sort()).toEqual(['c1', 'c2']);
  });

  it('despeja a conversa mais antiga ao passar do teto', () => {
    const s = useChatStore.getState();
    for (let i = 1; i <= 12; i += 1) s.setMessages(`c${i}`, [msg(`m${i}`)]);
    const cache = useChatStore.getState().messagesCache;
    expect(Object.keys(cache).length).toBeLessThanOrEqual(8);
    expect(cache.c1).toBeUndefined();   // a primeira saiu
    expect(cache.c12).toBeDefined();    // a última fica
  });

  it('reabrir uma conversa a torna recente de novo', () => {
    const s = useChatStore.getState();
    for (let i = 1; i <= 8; i += 1) s.setMessages(`c${i}`, [msg(`m${i}`)]);
    s.setMessages('c1', [msg('m1b')]);      // c1 volta a ser a mais recente
    s.setMessages('c9', [msg('m9')]);       // força um despejo
    const cache = useChatStore.getState().messagesCache;
    expect(cache.c1).toBeDefined();
    expect(cache.c2).toBeUndefined();       // agora a mais antiga é c2
  });

  it('carregar histórico não despeja a conversa que está aberta', () => {
    const s = useChatStore.getState();
    for (let i = 1; i <= 8; i += 1) s.setMessages(`c${i}`, [msg(`m${i}`)]);
    s.prependMessages('c8', [msg('antiga')]);
    expect(useChatStore.getState().messagesCache.c8).toHaveLength(2);
  });
});
