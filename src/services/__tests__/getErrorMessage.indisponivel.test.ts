/**
 * Num deploy o nginx responde 502 com uma PÁGINA HTML. `getErrorMessage`
 * devolvia o corpo como string e o toast mostrava
 * "<html><head><title>502 Bad Gateway</title>..." para o operador.
 * Medido 28/09–05/10: 3.359 cargas da lista de pedidos voltaram 502.
 */
process.env.VITE_API_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getErrorMessage } = require('../api') as typeof import('../api');

const erro = (status: number | undefined, data: unknown, message = `Request failed with status code ${status}`) => ({
  isAxiosError: true,
  name: 'AxiosError',
  message,
  response: status === undefined ? undefined : { data, status },
});

const INDISPONIVEL = 'Servidor indisponível no momento. Tente de novo em instantes.';

describe('getErrorMessage com servidor fora', () => {
  it('502 com página HTML do nginx não vira toast de HTML', () => {
    const html = '<html>\r\n<head><title>502 Bad Gateway</title></head>\r\n<body></body></html>';
    expect(getErrorMessage(erro(502, html))).toBe(INDISPONIVEL);
  });

  it('504 sem corpo também', () => {
    expect(getErrorMessage(erro(504, ''))).toBe(INDISPONIVEL);
  });

  it('sem resposta (rede caiu) fala português', () => {
    expect(getErrorMessage(erro(undefined, undefined, 'Network Error'))).toBe(
      'Sem conexão com o servidor. Confira a internet e tente de novo.',
    );
  });

  it('500 com mensagem do backend em JSON continua mostrando a mensagem', () => {
    expect(getErrorMessage(erro(500, { error: 'Falha ao emitir a nota.' }))).toBe('Falha ao emitir a nota.');
  });

  it('400 com texto continua igual', () => {
    expect(getErrorMessage(erro(400, { error: 'O pedido já está cancelado.' }))).toBe('O pedido já está cancelado.');
  });
});
