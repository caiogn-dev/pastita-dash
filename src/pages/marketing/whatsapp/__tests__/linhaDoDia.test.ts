/**
 * A campanha grátis não sai toda no horário marcado.
 *
 * Quem fecharia a janela de 24 h antes disso recebe antes, senão fica de fora
 * (em 18/set, 352 de 380 ficaram). A linha do dia é como o dono enxerga isso:
 * uma faixa por hora, o que já passou, o que falta e o horário da campanha.
 */
import { montarLinhaDoDia, horarioPermitido, resumoDaAgenda } from '../linhaDoDia';

const base = {
  faixas: [{ hora: 11, quantidade: 3 }, { hora: 20, quantidade: 12 }],
  horarioDaCampanha: '2026-09-18T20:00',
  agora: '2026-09-18T11:30',
};

describe('linha do dia', () => {
  it('marca a faixa do horário da campanha', () => {
    const linha = montarLinhaDoDia(base);

    expect(linha.horas.find((h) => h.hora === 20)?.eDaCampanha).toBe(true);
    expect(linha.horas.find((h) => h.hora === 11)?.eDaCampanha).toBe(false);
  });

  it('cobre o dia inteiro de 8h às 21h', () => {
    const linha = montarLinhaDoDia(base);

    expect(linha.horas[0].hora).toBe(8);
    expect(linha.horas[linha.horas.length - 1].hora).toBe(21);
  });

  it('marca como passada só a faixa anterior a agora', () => {
    const linha = montarLinhaDoDia(base);

    expect(linha.horas.find((h) => h.hora === 11)?.passou).toBe(true);
    expect(linha.horas.find((h) => h.hora === 12)?.passou).toBe(false);
    expect(linha.horas.find((h) => h.hora === 11)?.eAgora).toBe(true);
  });

  it('separa antecipados de quem recebe no horário', () => {
    const linha = montarLinhaDoDia(base);

    expect(linha.totalAntecipado).toBe(3);
    expect(linha.totalNoHorario).toBe(12);
  });

  it('mostra quantas já saíram em cada faixa', () => {
    const linha = montarLinhaDoDia({
      ...base,
      faixas: [{ hora: 11, quantidade: 3, enviadas: 3 }, { hora: 20, quantidade: 12, enviadas: 0 }],
    });

    expect(linha.horas.find((h) => h.hora === 11)?.enviadas).toBe(3);
    expect(linha.totalEnviado).toBe(3);
  });

  it('recusa horário fora de 8h–21h', () => {
    expect(horarioPermitido('2026-09-18T22:30').ok).toBe(false);
    expect(horarioPermitido('2026-09-18T22:30').motivo).toMatch(/entre 8h e 21h/);
    expect(horarioPermitido('2026-09-18T07:30').ok).toBe(false);
  });

  it('aceita 21:00 em ponto e 8:00 em ponto', () => {
    expect(horarioPermitido('2026-09-18T21:00').ok).toBe(true);
    expect(horarioPermitido('2026-09-18T08:00').ok).toBe(true);
  });

  it('campo pela metade não vira erro na cara de quem está digitando', () => {
    expect(horarioPermitido('2026-09-').ok).toBe(true);
    expect(horarioPermitido('').ok).toBe(true);
  });

  it('o resumo diz os dois números, não só o bom', () => {
    expect(resumoDaAgenda(montarLinhaDoDia(base)))
      .toBe('12 recebem às 20h · 3 antes, para não perder a janela');
  });

  it('sem antecipado, o resumo não inventa a segunda metade', () => {
    const linha = montarLinhaDoDia({ ...base, faixas: [{ hora: 20, quantidade: 12 }] });

    expect(resumoDaAgenda(linha)).toBe('12 recebem às 20h');
  });

  it('sem ninguém, o resumo é honesto', () => {
    const linha = montarLinhaDoDia({ ...base, faixas: [] });

    expect(resumoDaAgenda(linha)).toBe('Ninguém recebe nesse horário');
  });
});
