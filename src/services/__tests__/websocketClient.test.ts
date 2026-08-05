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
  // ── Explosão exponencial de cadeias (PD-RACE-002) ────────────────────────
  //
  // Uma falha produz DOIS sinais: o evento 'close' do socket e a rejeição da
  // Promise de connect(). Ambos chamavam attemptReconnect(), então cada rodada
  // de falha dobrava o número de cadeias: 1 → 2 → 4 → 8 → 16…
  // Num deploy de ~90s do backend (coisa rotineira) o navegador chegava a mais
  // de 100 handshakes concorrentes contra o Daphne no exato momento em que ele
  // estava subindo — auto-DDoS, com o rate limit passando a devolver 429 para
  // todo mundo.

  it('os dois sinais de uma reconexão falha não abrem duas cadeias', async () => {
    // A duplicação nasce a partir da SEGUNDA tentativa: o handler de 'error' só
    // rejeita a Promise, e quem reagenda é o catch DENTRO do setTimeout de
    // attemptReconnect. Quando o connect() da reconexão falha, chegam os dois
    // caminhos — o catch e o 'close' — e ambos chamavam attemptReconnect.
    // Cada rodada dobrava as cadeias: num deploy de ~90s eram >100 handshakes
    // concorrentes contra o Daphne no momento em que ele subia.
    const client = makeClient();
    const p = client.connect();
    FakeWebSocket.instances[0].fire('open');
    await p;

    FakeWebSocket.instances[0].fire('close');
    await jest.advanceTimersByTimeAsync(3_000);
    expect(FakeWebSocket.instances.length).toBe(2);

    // Falha da 2ª tentativa emitindo os DOIS sinais, com as microtasks drenadas
    // (é onde o catch do `await this.connect()` roda).
    const segundo = FakeWebSocket.instances[1];
    segundo.fire('error');
    segundo.fire('close');
    await jest.advanceTimersByTimeAsync(0);

    // Avança MUITO: se houvesse duas cadeias vivas, cada uma criaria o seu
    // socket e o total passaria de 3.
    await jest.advanceTimersByTimeAsync(120_000);
    expect(FakeWebSocket.instances.length).toBe(3);
  });

  it('disconnect() no meio de uma reconexão pendente não deixa timer órfão', async () => {
    const client = makeClient();
    const p = client.connect();
    FakeWebSocket.instances[0].fire('open');
    await p;

    FakeWebSocket.instances[0].fire('error');
    FakeWebSocket.instances[0].fire('close');
    // reconexão agendada mas ainda não disparada
    client.disconnect();
    jest.advanceTimersByTime(120_000);

    // Nenhum socket novo: antes, N cadeias escreviam no mesmo slot de timer e só
    // a última era cancelável — as outras disparavam, chamavam connect(), que
    // zera `intentionallyClosed`, e ressuscitavam um client já morto.
    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it('socket órfão que fecha depois não agenda reconexão', async () => {
    const client = makeClient();
    const p = client.connect();
    const primeiro = FakeWebSocket.instances[0];
    primeiro.fire('open');
    await p;

    primeiro.fire('close');
    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances.length).toBe(2);

    // O socket antigo emite 'close' atrasado. Ele não é mais o atual — deve ser
    // ignorado, não gerar uma terceira conexão.
    primeiro.fire('close');
    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances.length).toBe(2);
  });
});
