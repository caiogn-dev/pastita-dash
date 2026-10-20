/**
 * `subscribersApi.list` NÃO pode transformar uma falha total em lista vazia.
 *
 * O endpoint tenta `customers/` e, se cair, o fallback `subscribers/`. Quando os
 * DOIS caem (rede/500), o `catch` interno devolvia `[]` — e a base de clientes
 * lia esse `[]` como "nenhum cliente", mostrando "0 contatos" com confiança
 * quando, na verdade, a busca falhou. É o mesmo "vazio enganoso" que o loop já
 * corrigiu em várias telas, só que aqui nascido na camada de serviço: a página
 * nem recebia o erro para poder avisar. Agora a falha dos dois endpoints
 * propaga, para o chamador distinguir "vazio de verdade" de "vazio porque caiu".
 */
jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import api from '../api';
import { subscribersApi } from '../marketingService';

const get = api.get as jest.Mock;

beforeEach(() => {
  get.mockReset();
});

it('sucesso: devolve os clientes do endpoint principal', async () => {
  get.mockResolvedValueOnce({ data: [{ id: '1', email: 'a@b.com', name: 'Ana' }] });
  const data = await subscribersApi.list('loja-1');
  expect(data).toHaveLength(1);
  expect(data[0].email).toBe('a@b.com');
});

it('principal cai, fallback responde: devolve o fallback', async () => {
  get
    .mockRejectedValueOnce(new Error('500'))
    .mockResolvedValueOnce({ data: { results: [{ id: '2', email: 'c@d.com', name: 'Bia' }] } });
  const data = await subscribersApi.list('loja-1');
  expect(data).toHaveLength(1);
  expect(data[0].email).toBe('c@d.com');
});

it('os dois endpoints caem: PROPAGA o erro em vez de devolver []', async () => {
  get
    .mockRejectedValueOnce(new Error('500 customers'))
    .mockRejectedValueOnce(new Error('500 subscribers'));
  await expect(subscribersApi.list('loja-1')).rejects.toThrow();
});
