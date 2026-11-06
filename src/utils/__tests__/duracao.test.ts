import { formatarDuracao } from '../duracao';

describe('formatarDuracao', () => {
  it('até 60 min fica em minutos', () => {
    expect(formatarDuracao(0)).toBe('0min');
    expect(formatarDuracao(45)).toBe('45min');
    expect(formatarDuracao(60)).toBe('60min');
  });

  it('acima de 60 min vira horas e minutos', () => {
    expect(formatarDuracao(61)).toBe('1h 1min');
    expect(formatarDuracao(125)).toBe('2h 5min');
    expect(formatarDuracao(180)).toBe('3h');
  });

  it('acima de 24 h vira dias — nunca "60716min"', () => {
    expect(formatarDuracao(60716)).toBe('42 d');
    expect(formatarDuracao(24 * 60 + 1)).toBe('1 d');
  });

  it('arredonda minuto quebrado e trata vazio', () => {
    expect(formatarDuracao(40.4)).toBe('40min');
    expect(formatarDuracao(null)).toBe('—');
  });
});
