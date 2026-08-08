/**
 * De "7 dias" para duas datas que a API entende.
 *
 * O chip é a linguagem do dono ("este mês"); a API fala `date_from`/`date_to`.
 * A tradução mora aqui, sozinha e testada, porque um erro de um dia nesse
 * cálculo aparece como faturamento errado — e ninguém desconfia de um filtro.
 *
 * Todas as contas são feitas em data LOCAL. `toISOString()` converte para UTC
 * e, para quem está em Brasília, devolve o dia seguinte a partir das 21h — o
 * horário de pico do delivery.
 */
import { janelaDePeriodo, rotuloDaJanela } from '../janelaDePeriodo';

// 08/08/2026 às 22h, horário local: depois do fuso virar em UTC.
const AGORA = new Date(2026, 7, 8, 22, 0, 0);

describe('janelaDePeriodo', () => {
  it('hoje é um dia só, e é o dia local', () => {
    // Às 22h em Brasília já é dia 9 em UTC. Se a janela sair como 09/08, a
    // tela mostra "hoje: R$ 0,00" no meio do movimento.
    const j = janelaDePeriodo('hoje', AGORA);
    expect(j).toEqual({ date_from: '2026-08-08', date_to: '2026-08-08' });
  });

  it('ontem não inclui hoje', () => {
    expect(janelaDePeriodo('ontem', AGORA)).toEqual({
      date_from: '2026-08-07',
      date_to: '2026-08-07',
    });
  });

  it('7 dias conta hoje como um deles', () => {
    // Contar 7 dias PARA TRÁS a partir de hoje daria 8 dias no total — erro
    // clássico que infla a semana em 14%.
    const j = janelaDePeriodo('7d', AGORA);
    expect(j).toEqual({ date_from: '2026-08-02', date_to: '2026-08-08' });
  });

  it('30 dias idem', () => {
    expect(janelaDePeriodo('30d', AGORA)).toEqual({
      date_from: '2026-07-10',
      date_to: '2026-08-08',
    });
  });

  it('este mês começa no dia 1, não 30 dias atrás', () => {
    expect(janelaDePeriodo('mes', AGORA)).toEqual({
      date_from: '2026-08-01',
      date_to: '2026-08-08',
    });
  });

  it('mês passado é o mês inteiro, fechado', () => {
    // Fechar o mês é a razão nº 1 de abrir esta tela. Sem o mês fechado o dono
    // teria que digitar as duas datas todo mês.
    expect(janelaDePeriodo('mes_passado', AGORA)).toEqual({
      date_from: '2026-07-01',
      date_to: '2026-07-31',
    });
  });

  it('vira o ano sem quebrar', () => {
    const jan = new Date(2026, 0, 5, 10, 0, 0);
    expect(janelaDePeriodo('mes_passado', jan)).toEqual({
      date_from: '2025-12-01',
      date_to: '2025-12-31',
    });
  });

  it('período personalizado não mexe nas datas escolhidas', () => {
    expect(janelaDePeriodo('personalizado', AGORA)).toBeNull();
  });
});

describe('rotuloDaJanela', () => {
  it('diz o intervalo por extenso — o chip sozinho não informa as datas', () => {
    // "7 dias" não responde "de quando até quando", e é isso que o dono
    // precisa saber antes de comparar com o extrato do banco.
    expect(rotuloDaJanela({ date_from: '2026-08-02', date_to: '2026-08-08' }))
      .toBe('02/08/2026 a 08/08/2026');
  });

  it('um único dia não vira "de X a X"', () => {
    expect(rotuloDaJanela({ date_from: '2026-08-08', date_to: '2026-08-08' }))
      .toBe('08/08/2026');
  });

  it('sem período diz que está mostrando tudo', () => {
    expect(rotuloDaJanela({})).toMatch(/todo|tudo/i);
  });
});
