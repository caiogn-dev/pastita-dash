/**
 * Caiu para polling, tem que voltar ao WebSocket sozinho.
 *
 * MEDIDO (nginx, 28/09 → 05/10): 45.393 polls da lista de pedidos da Cê
 * Saladas, um a cada ~15 s, vindos das máquinas das lojas. O WebSocket só
 * falhava nas janelas de deploy, mas depois de uma falha a conexão ficava em
 * polling até alguém recarregar a página: pedido novo chegando com até 15 s
 * de atraso e 88 KB por consulta.
 *
 * Regra: em polling, uma sonda de WebSocket tenta de tempos em tempos. Só
 * quando o servidor confirma (`connection_established`) o polling para — sem
 * buraco em que um pedido novo passe despercebido.
 */
import { RealtimeConnection } from '../realtime';

class FakeWebSocket {
  static instancias: FakeWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  readyState = FakeWebSocket.CONNECTING;
  url: string;
  enviados: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instancias.push(this);
  }
  send(msg: string) { this.enviados.push(msg); }
  close() { this.readyState = 3; }
  abrir() { this.readyState = FakeWebSocket.OPEN; this.onopen?.(); }
  confirmar() { this.onmessage?.({ data: JSON.stringify({ type: 'connection_established' }) }); }
  falhar() { this.onclose?.({ code: 1006, reason: '' }); }
}

const ultimo = () => FakeWebSocket.instancias[FakeWebSocket.instancias.length - 1];

describe('RealtimeConnection volta ao WebSocket depois do polling', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    FakeWebSocket.instancias = [];
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
    (window as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
    fetchMock = jest.fn().mockResolvedValue({
      ok: true, status: 200, headers: { get: () => null }, json: async () => ({ results: [] }),
    });
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const caiParaPolling = async () => {
    const conn = new RealtimeConnection({ url: 'https://api.test', storeSlug: 'ce-saladas', token: 't' });
    conn.connect();
    ultimo().falhar();            // WebSocket inicial cai (deploy)
    await Promise.resolve();
    await Promise.resolve();
    expect(conn.getTransport()).toBe('polling');
    return conn;
  };

  it('a sonda volta ao WebSocket quando o servidor confirma', async () => {
    const conn = await caiParaPolling();
    const antes = FakeWebSocket.instancias.length;

    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instancias.length).toBe(antes + 1);   // abriu a sonda

    const sonda = ultimo();
    sonda.abrir();
    expect(sonda.enviados[0]).toContain('"auth"');
    expect(conn.getTransport()).toBe('polling');                // ainda sem confirmação

    sonda.confirmar();
    expect(conn.getTransport()).toBe('websocket');
    expect(conn.isConnected()).toBe(true);

    // O polling parou: nenhum fetch novo depois da promoção.
    const chamadas = fetchMock.mock.calls.length;
    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(fetchMock.mock.calls.length).toBe(chamadas);
    conn.disconnect();
  });

  it('sonda que falha não derruba o polling e tenta de novo depois', async () => {
    const conn = await caiParaPolling();
    jest.advanceTimersByTime(60_000);
    const sonda = ultimo();
    sonda.falhar();
    expect(conn.getTransport()).toBe('polling');
    expect(conn.isConnected()).toBe(true);

    const antes = FakeWebSocket.instancias.length;
    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instancias.length).toBe(antes + 1);
    conn.disconnect();
  });

  it('disconnect cancela a sonda', async () => {
    const conn = await caiParaPolling();
    conn.disconnect();
    const antes = FakeWebSocket.instancias.length;
    jest.advanceTimersByTime(120_000);
    expect(FakeWebSocket.instancias.length).toBe(antes);
  });
});
