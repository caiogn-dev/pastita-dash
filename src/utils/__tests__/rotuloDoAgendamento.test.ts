// 27/10: o selo do quadro saía "27/1014:00" (join sem espaço) e cortava a
// faixa "14:00-15:00" em "14:00"; o detalhe dizia "às 14:00"; a comanda,
// "2026-10-27 14:00-15:00".
import { rotuloDoAgendamento } from '../rotuloDoAgendamento';

test('curto: data e faixa separadas, faixa inteira', () => {
  expect(rotuloDoAgendamento('2026-10-27', '14:00-15:00')).toBe('27/10 14:00–15:00');
});

test('hora solta continua curta', () => {
  expect(rotuloDoAgendamento('2026-10-27', '14:30:00')).toBe('27/10 14:30');
});

test('longo: dia por extenso', () => {
  expect(rotuloDoAgendamento('2026-10-27', '14:00-15:00', 'longo')).toBe('27 de outubro, 14:00–15:00');
});

test('sem agendamento: vazio', () => {
  expect(rotuloDoAgendamento(null, '')).toBe('');
  expect(rotuloDoAgendamento(undefined, undefined)).toBe('');
});
