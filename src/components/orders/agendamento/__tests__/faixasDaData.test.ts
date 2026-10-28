// 27/10, Ivoneth: o painel oferecia 10–12, 12–14… (lista fixa de agosto),
// mas desde 21/10 a loja tem faixas próprias de 1 h ("14:00-15:00"). O pedido
// agendado não aparecia marcado e a faixa certa não existia para escolher.
import { faixasDaData } from '../faixasDaData';

const agenda = [
  { data: '2026-10-28', faixas: ['08:00-09:00', '09:00-10:00'] },
  { data: '2026-10-29', faixas: ['09:00-10:00', '14:00-15:00'] },
];

test('dia da agenda: as faixas daquele dia', () => {
  expect(faixasDaData(agenda, '2026-10-28', '')).toEqual(['08:00-09:00', '09:00-10:00']);
});

test('dia fora da agenda (passado, longe): todas as faixas que a loja usa', () => {
  expect(faixasDaData(agenda, '2026-10-20', '')).toEqual(['08:00-09:00', '09:00-10:00', '14:00-15:00']);
});

test('a faixa já gravada no pedido sempre aparece, mesmo fora da agenda', () => {
  expect(faixasDaData(agenda, '2026-10-28', '14:00-15:00')).toEqual(['08:00-09:00', '09:00-10:00', '14:00-15:00']);
});

test('sem agenda (loja sem horário ou falha): nada inventado além da faixa gravada', () => {
  expect(faixasDaData([], '2026-10-28', '')).toEqual([]);
  expect(faixasDaData([], '2026-10-28', '14:00-15:00')).toEqual(['14:00-15:00']);
});
