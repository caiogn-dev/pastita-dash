/**
 * O erro que a dona da loja vê precisa dizer O QUE fazer.
 *
 * 11/ago/2026: ela tentou lançar o pedido da Aline pelo PDV e o painel mostrou
 * só "Invalid data provided." — sem campo, sem motivo, sem saída. O backend
 * tinha mandado o campo culpado dentro de `details`:
 *
 *   {"error": {"code": "validation_error",
 *              "message": "Invalid data provided.",
 *              "details": {"customer_phone": ["Número de telefone inválido"]}}}
 *
 * `getErrorMessage` lia `message` ANTES de `details` e devolvia a frase
 * genérica, jogando fora a única informação útil da resposta.
 */
// `api.ts` exige VITE_API_URL fora de DEV e lê a env no momento do import —
// por isso `require` depois de setar, e não `import` (que seria içado antes).
process.env.VITE_API_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getErrorMessage } = require('../api') as typeof import('../api');

const axiosError = (data: unknown) => ({
  isAxiosError: true,
  name: 'AxiosError',
  message: 'Request failed with status code 400',
  response: { data, status: 400 },
});

describe('getErrorMessage', () => {
  it('mostra o campo que falhou em vez da frase genérica', () => {
    const err = axiosError({
      error: {
        code: 'validation_error',
        message: 'Invalid data provided.',
        details: { customer_phone: ['Número de telefone inválido'] },
      },
    });

    const msg = getErrorMessage(err);

    expect(msg).toContain('Número de telefone inválido');
    expect(msg).not.toBe('Invalid data provided.');
  });

  it('nomeia o campo quando há mais de um erro', () => {
    const err = axiosError({
      error: {
        code: 'validation_error',
        message: 'Invalid data provided.',
        details: {
          customer_phone: ['Telefone inválido'],
          delivery_address: ['Endereço obrigatório'],
        },
      },
    });

    const msg = getErrorMessage(err);

    expect(msg).toContain('Telefone inválido');
    expect(msg).toContain('Endereço obrigatório');
  });

  it('cai na mensagem quando não há details', () => {
    const err = axiosError({ error: { code: 'api_error', message: 'Loja fechada', details: {} } });
    expect(getErrorMessage(err)).toBe('Loja fechada');
  });

  it('continua funcionando com o formato simples do DRF', () => {
    const err = axiosError({ detail: 'Não encontrado.' });
    expect(getErrorMessage(err)).toBe('Não encontrado.');
  });

  it('erro sem resposta nenhuma não quebra', () => {
    expect(getErrorMessage(new Error('offline'))).toBe('offline');
  });
});
