/**
 * Quanto tempo o cliente está esperando — e quando isso vira urgência.
 * Régua do balcão: até 3 min é normal, depois de 3 pede atenção, depois de 10
 * o cliente está sendo perdido.
 */
import { haQuanto, segundosDeEspera, tomDaEspera } from '../tempoDeEspera';

describe('haQuanto', () => {
  it.each([
    [0, 'agora'],
    [59, 'agora'],
    [60, 'há 1 min'],
    [12 * 60 + 30, 'há 12 min'],
    [2 * 3600, 'há 2h'],
    [2 * 3600 + 10 * 60, 'há 2h 10min'],
    [26 * 3600, 'há 1 dia'],
    [3 * 86400, 'há 3 dias'],
  ])('%i s → %s', (s, texto) => {
    expect(haQuanto(s)).toBe(texto);
  });

  it('negativo (relógio adiantado) não vira "há -2 min"', () => {
    expect(haQuanto(-120)).toBe('agora');
  });
});

describe('tomDaEspera', () => {
  it('até 3 min não grita', () => {
    expect(tomDaEspera(3 * 60)).toBe('neutral');
  });
  it('passou de 3 min pede atenção', () => {
    expect(tomDaEspera(3 * 60 + 1)).toBe('warning');
  });
  it('passou de 10 min é vermelho', () => {
    expect(tomDaEspera(10 * 60 + 1)).toBe('danger');
  });
});

describe('segundosDeEspera', () => {
  const agora = Date.parse('2026-09-26T12:00:00Z');

  it('usa esperando_desde quando existe: o tempo anda sem nova busca', () => {
    expect(segundosDeEspera({ esperando_desde: '2026-09-26T11:48:00Z', minutos_esperando: 1 }, agora, agora)).toBe(12 * 60);
  });

  it('sem data, soma ao valor da resposta o tempo desde a busca', () => {
    const buscadoEm = agora - 90_000;
    expect(segundosDeEspera({ esperando_ha_segundos: 60, minutos_esperando: 1 }, buscadoEm, agora)).toBe(150);
  });

  it('resposta antiga (só minutos) continua funcionando', () => {
    expect(segundosDeEspera({ minutos_esperando: 40 }, agora, agora)).toBe(2400);
  });

  it('ninguém esperando = 0, não conta relógio', () => {
    expect(segundosDeEspera({ minutos_esperando: 0, esperando_ha_segundos: 0 }, agora - 60_000, agora)).toBe(0);
  });
});
