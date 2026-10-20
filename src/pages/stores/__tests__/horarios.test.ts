/**
 * Horário com dois turnos e pausa programada — a parte que decide o que vai
 * para o servidor. Contrato do server2 (b0582b74):
 *   operating_hours[dia] = { is_open, open, close, intervals? }
 *   metadata.pausas = [{ inicio, fim, motivo }]  (ISO com fuso)
 */
import {
  turnosDoDia, comTurnos, problemaDosTurnos, copiarParaOsOutrosDias,
  lerPausas, pausaParaGravar, pausasQueValem, problemaDaPausa,
} from '../horarios';

describe('turnos', () => {
  it('dia antigo (open/close) é um turno só', () => {
    expect(turnosDoDia({ is_open: true, open: '08:00', close: '17:00' })).toEqual([{ open: '08:00', close: '17:00' }]);
  });

  it('dois turnos gravam intervals e o envelope em open/close', () => {
    // O envelope mantém leitores antigos (bot, relatórios) num horário plausível.
    const dia = comTurnos({ is_open: true, open: '08:00', close: '17:00' }, [
      { open: '08:00', close: '13:00' }, { open: '15:00', close: '17:00' },
    ]);
    expect(dia).toEqual({
      is_open: true, open: '08:00', close: '17:00',
      intervals: [{ open: '08:00', close: '13:00' }, { open: '15:00', close: '17:00' }],
    });
  });

  it('voltar para um turno apaga intervals', () => {
    const dia = comTurnos({ is_open: true, open: '08:00', close: '17:00', intervals: [] }, [{ open: '09:00', close: '18:00' }]);
    expect(dia).toEqual({ is_open: true, open: '09:00', close: '18:00' });
  });

  it('ordena os turnos ao gravar', () => {
    const dia = comTurnos({ is_open: true, open: '', close: '' }, [
      { open: '15:00', close: '17:00' }, { open: '08:00', close: '13:00' },
    ]);
    expect(dia.intervals?.[0].open).toBe('08:00');
  });

  it('turno recém-adicionado (vazio) fica por último', () => {
    const dia = comTurnos({ is_open: true, open: '08:00', close: '17:00' }, [
      { open: '08:00', close: '17:00' }, { open: '', close: '' },
    ]);
    expect(dia.intervals).toEqual([{ open: '08:00', close: '17:00' }, { open: '', close: '' }]);
  });

  it('acusa turno que fecha antes de abrir e turnos que se cruzam', () => {
    expect(problemaDosTurnos([{ open: '13:00', close: '08:00' }])).toBe('Um turno fecha antes de abrir.');
    expect(problemaDosTurnos([{ open: '08:00', close: '14:00' }, { open: '13:00', close: '17:00' }]))
      .toBe('Os turnos se sobrepõem.');
    expect(problemaDosTurnos([{ open: '08:00', close: '13:00' }, { open: '15:00', close: '17:00' }])).toBeNull();
    expect(problemaDosTurnos([{ open: '', close: '13:00' }])).toBe('Preencha a hora de abrir e de fechar.');
  });

  it('copia o dia para os outros dias ABERTOS, sem reabrir dia fechado', () => {
    const horas = {
      monday: { is_open: true, open: '08:00', close: '13:00', intervals: [{ open: '08:00', close: '13:00' }, { open: '15:00', close: '17:00' }] },
      tuesday: { is_open: true, open: '09:00', close: '18:00' },
      sunday: { is_open: false, open: '08:00', close: '12:00' },
    };
    const novo = copiarParaOsOutrosDias(horas, 'monday');
    expect(novo.tuesday).toEqual({ ...horas.monday });
    expect(novo.sunday).toEqual(horas.sunday);
  });
});

describe('pausas', () => {
  const agora = new Date('2026-10-23T12:00:00-03:00');

  it('lê do metadata e tolera ausência', () => {
    expect(lerPausas({})).toEqual([]);
    expect(lerPausas({ pausas: [{ inicio: '2026-10-23T10:00:00-03:00', fim: '2026-10-23T14:00:00-03:00', motivo: 'Gás' }] }))
      .toEqual([{ inicio: '2026-10-23T10:00', fim: '2026-10-23T14:00', motivo: 'Gás' }]);
  });

  it('grava em ISO com o fuso de Brasília', () => {
    expect(pausaParaGravar({ inicio: '2026-10-23T10:00', fim: '2026-10-23T14:00', motivo: ' Gás ' }))
      .toEqual({ inicio: '2026-10-23T10:00:00-03:00', fim: '2026-10-23T14:00:00-03:00', motivo: 'Gás' });
  });

  it('pausa que já acabou sai da lista ao salvar', () => {
    const pausas = [
      { inicio: '2026-10-22T10:00', fim: '2026-10-22T14:00', motivo: 'ontem' },
      { inicio: '2026-10-23T10:00', fim: '2026-10-23T14:00', motivo: 'agora' },
    ];
    expect(pausasQueValem(pausas, agora).map((p) => p.motivo)).toEqual(['agora']);
  });

  it('valida início, fim e motivo', () => {
    expect(problemaDaPausa({ inicio: '', fim: '2026-10-23T14:00', motivo: '' })).toBe('Preencha início e fim da pausa.');
    expect(problemaDaPausa({ inicio: '2026-10-23T14:00', fim: '2026-10-23T10:00', motivo: '' })).toBe('A pausa termina antes de começar.');
    expect(problemaDaPausa({ inicio: '2026-10-23T10:00', fim: '2026-10-23T14:00', motivo: 'x'.repeat(256) }))
      .toBe('O motivo pode ter até 255 letras.');
    expect(problemaDaPausa({ inicio: '2026-10-23T10:00', fim: '2026-10-23T14:00', motivo: '' })).toBeNull();
  });
});
