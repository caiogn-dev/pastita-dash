/**
 * O singleton do WebSocket não pode devolver uma instância com config velho.
 *
 * `createWebSocket` só construía quando `instance` era null e, existindo uma,
 * devolvia a antiga IGNORANDO o config novo. Na prática a página de pedidos
 * recebia um cliente apontando para outra loja, ou com token já trocado, ou já
 * desconectado — e o pedido novo nunca aparecia sem F5, enquanto o inbox
 * (que usa outro hook) chegava na hora.
 *
 * Regra: mesma loja+token → reusa (é o ponto do singleton). Config diferente →
 * descarta a antiga e constrói de novo.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createWebSocket, clearWebSocketInstance } from './websocket';

const cfg = (storeSlug: string, token = 'tok-1') => ({
  url: 'wss://backend.teste',
  token,
  storeSlug,
});

describe('singleton do WebSocket', () => {
  afterEach(() => clearWebSocketInstance());

  it('reusa a instância quando o config é o mesmo', () => {
    expect(createWebSocket(cfg('ce-saladas'))).toBe(createWebSocket(cfg('ce-saladas')));
  });

  it('troca de loja constrói um cliente novo', () => {
    const a = createWebSocket(cfg('ce-saladas'));
    expect(createWebSocket(cfg('kero-kero'))).not.toBe(a);
  });

  it('token novo constrói um cliente novo', () => {
    const a = createWebSocket(cfg('ce-saladas', 'tok-1'));
    expect(createWebSocket(cfg('ce-saladas', 'tok-2'))).not.toBe(a);
  });

  it('o cliente devolvido carrega SEMPRE o config pedido', () => {
    createWebSocket(cfg('ce-saladas'));
    const b = createWebSocket(cfg('kero-kero', 'tok-9')) as unknown as {
      config: { storeSlug: string; token: string };
    };
    expect(b.config.storeSlug).toBe('kero-kero');
    expect(b.config.token).toBe('tok-9');
  });
});
