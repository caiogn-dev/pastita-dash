/**
 * Erro no navegador do operador precisa chegar em alguém.
 *
 * 05/10: o GlitchTip só tinha o projeto `server2`; o error boundary do painel
 * mandava o erro para o console do computador da loja. Agora vai para
 * POST /core/erros-do-painel/, que vira issue no GlitchTip.
 */
process.env.VITE_API_URL = 'https://api.test/api/v1';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { reportarErro, _zerarReportes } = require('../reportarErro') as typeof import('../reportarErro');

describe('reportarErro', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    _zerarReportes();
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
    window.history.pushState({}, '', '/pedidos/abc');
  });

  const corpo = (i = 0) => JSON.parse(fetchMock.mock.calls[i][1].body);

  it('manda mensagem, rota, origem e pilha para o servidor', () => {
    const erro = new Error("Cannot read properties of undefined (reading 'map')");
    reportarErro(erro, 'render', 'at OrdersPage');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/v1/core/erros-do-painel/');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(corpo()).toMatchObject({
      mensagem: "Cannot read properties of undefined (reading 'map')",
      rota: '/pedidos/abc',
      origem: 'render',
    });
    expect(corpo().pilha).toContain('at OrdersPage');
  });

  it('o mesmo erro não é mandado duas vezes', () => {
    reportarErro(new Error('igual'), 'janela');
    reportarErro(new Error('igual'), 'janela');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('para depois de 10 erros na mesma página (loop de render)', () => {
    for (let i = 0; i < 30; i++) reportarErro(new Error(`erro ${i}`), 'janela');
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('ignora ruído que já tem dono', () => {
    const http = Object.assign(new Error('Request failed with status code 500'), { isAxiosError: true });
    reportarErro(http, 'promessa');                                              // o servidor já registra
    reportarErro(new Error('ResizeObserver loop completed with undelivered notifications'), 'janela');
    reportarErro(new TypeError('Failed to fetch dynamically imported module: x.js'), 'promessa'); // recarrega sozinho
    reportarErro(Object.assign(new Error('aborted'), { name: 'AbortError' }), 'promessa');
    const ext = new Error('boom'); ext.stack = 'Error: boom\n at chrome-extension://abc/content.js:1:1';
    reportarErro(ext, 'janela');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aceita o que não é Error (promise rejeitada com texto)', () => {
    reportarErro('deu ruim', 'promessa');
    expect(corpo().mensagem).toBe('deu ruim');
  });

  it('falha ao reportar nunca vira outro erro', () => {
    fetchMock.mockImplementation(() => { throw new Error('sem rede'); });
    expect(() => reportarErro(new Error('x'), 'janela')).not.toThrow();
  });
});
