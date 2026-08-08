/**
 * A página de cupons passa a dizer o que fazer, não só quantos existem.
 *
 * "21 cupons ativos" pode ser uma operação saudável ou vinte cupons esquecidos
 * que ninguém usa. O que muda a semana do dono é a frase — "4 expiram em 7
 * dias, priorize a extensão" — e ela se calcula do que já está na tela.
 */
import { insightsDeCupons } from '../insightsDeCupons';

const dias = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const cupom = (over: Record<string, unknown> = {}) =>
  ({
    id: String(Math.random()),
    code: 'TESTE',
    is_active: true,
    used_count: 0,
    usage_limit: null,
    valid_from: dias(-60),
    valid_until: dias(60),
    ...over,
  } as never);

describe('insightsDeCupons', () => {
  it('sem cupons não inventa diagnóstico', () => {
    expect(insightsDeCupons([])).toEqual([]);
    expect(insightsDeCupons(null)).toEqual([]);
  });

  it('avisa dos que expiram nos próximos 7 dias', () => {
    const r = insightsDeCupons([
      cupom({ code: 'A', valid_until: dias(3) }),
      cupom({ code: 'B', valid_until: dias(90) }),
    ]);
    const i = r.find((x) => x.chave === 'expirando')!;
    expect(i.titulo).toMatch(/1 cupom expirando/);
    expect(i.valor).toBe('A');
  });

  it('cupom JÁ expirado não vira alerta', () => {
    // É história, não pendência. Alerta que não pede nada ensina o operador a
    // ignorar a seção inteira.
    const r = insightsDeCupons([cupom({ valid_until: dias(-5) })]);
    expect(r.find((x) => x.chave === 'expirando')).toBeUndefined();
  });

  it('cupom inativo não entra em nenhum diagnóstico', () => {
    // Desligado é decisão sua, não problema.
    const r = insightsDeCupons([
      cupom({ is_active: false, valid_until: dias(2), used_count: 99 }),
    ]);
    expect(r).toEqual([]);
  });

  it('aponta o mais usado, para repetir e não só admirar', () => {
    const r = insightsDeCupons([
      cupom({ code: 'FRACO', used_count: 2 }),
      cupom({ code: 'CAMPEAO', used_count: 17 }),
    ]);
    const i = r.find((x) => x.chave === 'campeao')!;
    expect(i.titulo).toMatch(/CAMPEAO/);
    expect(i.recomendacao).toMatch(/duplique/i);
  });

  it('acusa cupom ativo há semanas sem nenhum uso', () => {
    const r = insightsDeCupons([cupom({ valid_from: dias(-40), used_count: 0 })]);
    expect(r.find((x) => x.chave === 'sem_uso')).toBeTruthy();
  });

  it('cupom recém-criado sem uso NÃO é acusado', () => {
    // Dois dias no ar é amostra pequena, não diagnóstico. Acusar aqui seria
    // cobrar resultado de algo que mal começou.
    const r = insightsDeCupons([cupom({ valid_from: dias(-2), used_count: 0 })]);
    expect(r.find((x) => x.chave === 'sem_uso')).toBeUndefined();
  });

  it('avisa quando o cupom está perto de estourar o limite', () => {
    // Sem isso o cupom morre sozinho no meio da campanha e ninguém percebe.
    const r = insightsDeCupons([cupom({ code: 'X', used_count: 45, usage_limit: 50 })]);
    const i = r.find((x) => x.chave === 'limite')!;
    expect(i.valor).toBe('45 de 50');
  });

  it('cupom sem limite não gera alerta de limite', () => {
    const r = insightsDeCupons([cupom({ used_count: 900, usage_limit: null })]);
    expect(r.find((x) => x.chave === 'limite')).toBeUndefined();
  });

  it('o alerta com PRAZO vem primeiro', () => {
    // Entre "expira em 3 dias" e "seu melhor cupom é X", só o primeiro tem
    // relógio correndo.
    const r = insightsDeCupons([
      cupom({ code: 'BOM', used_count: 30 }),
      cupom({ code: 'PRESSA', valid_until: dias(1) }),
    ]);
    expect(r[0].chave).toBe('expirando');
  });

  it('toda linha tem recomendação — número a tabela já mostra', () => {
    const r = insightsDeCupons([
      cupom({ code: 'A', valid_until: dias(2) }),
      cupom({ code: 'B', used_count: 5 }),
      cupom({ code: 'C', valid_from: dias(-40) }),
    ]);
    expect(r.length).toBeGreaterThan(0);
    r.forEach((i) => expect(i.recomendacao.trim()).not.toBe(''));
  });
});
