// Regressão: disconnect() intencional (troca de loja, unmount) disparava o
// evento 'close' do socket, que agendava reconexão — o client "zumbi" da loja
// antiga ficava reconectando pra sempre em paralelo com o novo (visto em prod
// 18/jul: conexões de lojas já fechadas ciclando nos logs do daphne).
// uuid é ESM puro e o transform do jest não o cobre — mock direto.
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

import { WebSocketClient } from '../websocket';

type Listener = (ev?: unknown) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  private listeners = new Map<string, Listener[]>();
  sent: string[] = [];

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, cb: Listener) {
    const arr = this.listeners.get(type) ?? [];
    arr.push(cb);
    this.listeners.set(type, arr);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.fire('close');
  }

  fire(type: string, ev?: unknown) {
    if (type === 'open') this.readyState = 1;
    (this.listeners.get(type) ?? []).forEach((cb) => cb(ev));
  }
}

describe('WebSocketClient — reconexão', () => {
  let originalWs: typeof WebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    FakeWebSocket.instances = [];
    originalWs = global.WebSocket;
    (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as unknown as { WebSocket: unknown }).WebSocket = originalWs;
  });

  const makeClient = () =>
    new WebSocketClient({ url: 'wss://host', token: 't', storeSlug: 'loja' });

  it('reconecta após queda não intencional', async () => {
    const client = makeClient();
    const p = client.connect();
    FakeWebSocket.instances[0].fire('open');
    await p;

    FakeWebSocket.instances[0].fire('close');
    jest.advanceTimersByTime(5_000);
    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it('NÃO reconecta após disconnect() intencional (sem client zumbi)', async () => {
    const client = makeClient();
    const p = client.connect();
    FakeWebSocket.instances[0].fire('open');
    await p;

    client.disconnect();
    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it('volta a reconectar se connect() for chamado de novo após disconnect()', async () => {
    const client = makeClient();
    const p1 = client.connect();
    FakeWebSocket.instances[0].fire('open');
    await p1;

    client.disconnect();
    const p2 = client.connect();
    FakeWebSocket.instances[1].fire('open');
    await p2;

    FakeWebSocket.instances[1].fire('close');
    jest.advanceTimersByTime(5_000);
    expect(FakeWebSocket.instances.length).toBe(3);
  });
});
