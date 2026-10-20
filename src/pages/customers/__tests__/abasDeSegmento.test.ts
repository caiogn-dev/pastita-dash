/**
 * Abas acima da lista de clientes: Todos · VIP · Ativos · Em risco · Inativos ·
 * Nunca compraram. O cartão de cima já dizia "107 em risco" e a lista não
 * deixava ver QUEM — o número não virava ação.
 */
import { abasDeSegmento, segmentoDaUrl } from '../abasDeSegmento';

const seg = {
  ativos: 10, em_risco: 3, inativos: 40, sem_compra: 7, vip: 2,
  reguas: {
    ativos: 'comprou nos últimos 30 dias', em_risco: '30 a 45 dias sem comprar',
    inativos: 'mais de 45 dias sem comprar', sem_compra: 'cadastrado, nunca comprou',
    vip: '5 ou mais pedidos',
  },
};

describe('abas de segmento', () => {
  it('começa por Todos e põe o contador de cada grupo', () => {
    const abas = abasDeSegmento(seg);
    expect(abas.map((a) => a.value)).toEqual(['todos', 'vip', 'ativos', 'em_risco', 'inativos', 'sem_compra']);
    expect(abas.find((a) => a.value === 'em_risco')?.count).toBe(3);
    expect(abas[0].count).toBeUndefined();
  });

  it('sem stats ainda, mostra as abas sem número em vez de zero', () => {
    // Zero enquanto carrega lê como "ninguém em risco" — o vazio enganoso.
    expect(abasDeSegmento(undefined).every((a) => a.count === undefined)).toBe(true);
  });

  it('servidor antigo sem VIP não vira "0 VIP"', () => {
    const { vip: _v, ...semVip } = seg;
    expect(abasDeSegmento(semVip as never).find((a) => a.value === 'vip')?.count).toBeUndefined();
  });

  it('lê o segmento da URL e ignora valor desconhecido', () => {
    expect(segmentoDaUrl(new URLSearchParams('segmento=em_risco'))).toBe('em_risco');
    expect(segmentoDaUrl(new URLSearchParams('segmento=xyz'))).toBe('todos');
    expect(segmentoDaUrl(new URLSearchParams(''))).toBe('todos');
  });
});
