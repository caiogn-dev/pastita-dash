/**
 * A lista de clientes respondia "quem já comprou aqui". Não respondia a
 * pergunta que faz o dono abrir a tela: **para quem eu mando mensagem hoje**.
 *
 * O backend já devolve os segmentos com as réguas. Aqui só decidimos o que
 * vira alerta — e a régua VAI JUNTO no texto, sempre. "106 em risco" sem o
 * corte é opinião nossa disfarçada de dado: quem lê não tem como concordar ou
 * discordar, nem explicar o número para outra pessoa.
 */
import { insightsDeClientes } from '../insightsDeClientes';

const REGUAS = {
  ativos: 'comprou nos últimos 30 dias',
  em_risco: '30 a 45 dias sem comprar',
  inativos: 'mais de 45 dias sem comprar',
  sem_compra: 'cadastrado, nunca comprou',
};

const base = { ativos: 0, em_risco: 0, inativos: 0, sem_compra: 0, reguas: REGUAS };

describe('insightsDeClientes', () => {
  it('sem segmentos não inventa alerta', () => {
    expect(insightsDeClientes(undefined)).toEqual([]);
    expect(insightsDeClientes({ ...base })).toEqual([]);
  });

  it('em risco vem primeiro — é o único com janela de recuperação', () => {
    // Inativo há 3 meses volta com campanha, não com lembrete. Quem está no
    // meio do caminho ainda responde a um "sentimos sua falta".
    const itens = insightsDeClientes({ ...base, em_risco: 12, inativos: 40 });
    expect(itens[0].chave).toBe('em_risco');
  });

  it('cada alerta carrega a régua no texto', () => {
    const itens = insightsDeClientes({ ...base, em_risco: 12, inativos: 40, sem_compra: 8 });
    for (const i of itens) {
      expect(i.valor.length).toBeGreaterThan(0);
      expect(`${i.titulo} ${i.valor}`).toMatch(/dias|nunca comprou/);
    }
  });

  it('quem nunca comprou não é reativação, é primeira compra', () => {
    // Mandar "sentimos sua falta" para quem nunca pediu queima o contato e
    // expõe que a loja não sabe com quem está falando.
    const itens = insightsDeClientes({ ...base, sem_compra: 8 });
    const i = itens.find((x) => x.chave === 'sem_compra')!;
    expect(i.recomendacao).toMatch(/primeira compra|cupom de boas/i);
    expect(i.recomendacao).not.toMatch(/volta|falta|reativ/i);
  });

  it('base saudável é elogio, não silêncio', () => {
    // Zero alertas com 200 ativos lê como "a tela quebrou". Dizer que está bem
    // é informação.
    const itens = insightsDeClientes({ ...base, ativos: 200 });
    expect(itens).toHaveLength(1);
    expect(itens[0].direcao).toBe('alta');
    expect(itens[0].chave).toBe('saudavel');
  });

  it('singular e plural corretos — "1 clientes" denuncia máquina', () => {
    const itens = insightsDeClientes({ ...base, em_risco: 1 });
    expect(itens[0].titulo).toMatch(/1 cliente em risco/);
    expect(itens[0].titulo).not.toMatch(/clientes/);
  });
});
