/**
 * O que a tela diz sobre a janela de 24h na hora de escolher o horário.
 *
 * Sem esse número o dono agenda no escuro: "manda às 20h" pode significar 10
 * pessoas ou 2, e ele só descobre depois que a campanha rodou.
 *
 * A regra é da Meta: dentro de 24h da última mensagem que a CLIENTE mandou, a
 * loja responde texto livre de graça. Fora disso só template, cobrado por
 * conversa. A janela encolhe com o tempo — por isso a conta é sempre para o
 * HORÁRIO DO DISPARO, nunca para agora.
 */
import { avisoDaJanela, horarioParaConsulta } from '../janelaDe24h';

describe('aviso da janela de 24h', () => {
  it('diz quantos recebem de graça', () => {
    expect(avisoDaJanela({ dentro: 10, fora: 90 }))
      .toContain('10');
  });

  it('diz também quantos ficam de fora — é o custo da escolha', () => {
    // Ver só "10 recebem" esconde que 90 pessoas não vão saber da promoção.
    // Com os dois números o dono decide entre grátis agora e template pago.
    expect(avisoDaJanela({ dentro: 10, fora: 90 })).toContain('90');
  });

  it('avisa quando NINGUÉM está na janela', () => {
    // O pior caso silencioso: agendar uma campanha que não sai para ninguém.
    expect(avisoDaJanela({ dentro: 0, fora: 90 }))
      .toMatch(/ningu[ée]m/i);
  });

  it('fala no singular quando é uma pessoa só', () => {
    const texto = avisoDaJanela({ dentro: 1, fora: 5 });

    expect(texto).toMatch(/1 cliente\b/);
    expect(texto).not.toMatch(/1 clientes/);
  });

  it('não quebra sem resposta do servidor', () => {
    expect(avisoDaJanela(null)).toBe('');
  });
});

describe('horário que vai para a consulta', () => {
  it('converte o campo datetime-local para ISO', () => {
    // `datetime-local` entrega "2026-09-05T20:00" — sem fuso. Mandar essa
    // string crua faria o backend ler como UTC e a conta sairia 3 horas
    // deslocada, bem no horário que mais importa (a noite).
    const iso = horarioParaConsulta('2026-09-05T20:00');

    expect(iso).toBe(new Date('2026-09-05T20:00').toISOString());
  });

  it('sem horário escolhido, pergunta por AGORA', () => {
    expect(horarioParaConsulta('')).toBeUndefined();
  });

  it('data pela metade não vira consulta inválida', () => {
    expect(horarioParaConsulta('2026-09-')).toBeUndefined();
  });
});
