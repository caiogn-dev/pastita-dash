import { RELATORIOS, relatorioPorSlug, relatorioDaVisao, type TabValue } from '../relatorios';

const TODAS_AS_VISOES: TabValue[] = [
  'overview', 'orders', 'products', 'stock',
  'peaks', 'geo', 'operations', 'crm', 'finance', 'bot',
];

it('nenhuma visão se perde na reorganização', () => {
  const cobertas = RELATORIOS.flatMap((r) => r.visoes.map((v) => v.value));
  expect(cobertas.sort()).toEqual([...TODAS_AS_VISOES].sort());
});

it('nenhuma visão aparece em dois relatórios', () => {
  const cobertas = RELATORIOS.flatMap((r) => r.visoes.map((v) => v.value));
  expect(new Set(cobertas).size).toBe(cobertas.length);
});

it('cada relatório tem no máximo quatro visões — dez abas foi o problema', () => {
  for (const r of RELATORIOS) expect(r.visoes.length).toBeLessThanOrEqual(4);
});

it('todo relatório diz a que pergunta responde', () => {
  for (const r of RELATORIOS) expect(r.descricao.length).toBeGreaterThan(20);
});

it('slug desconhecido cai na visão geral em vez de tela branca', () => {
  expect(relatorioPorSlug('inventado').slug).toBe('visao-geral');
  expect(relatorioPorSlug(undefined).slug).toBe('visao-geral');
});

it('acha o relatório dono de uma visão — link antigo por aba não morre', () => {
  expect(relatorioDaVisao('geo').slug).toBe('operacao');
  expect(relatorioDaVisao('products').slug).toBe('vendas');
  expect(relatorioDaVisao('bot').slug).toBe('clientes');
});
