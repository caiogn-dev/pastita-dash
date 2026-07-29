import { formatConversationTime, formatDayLabel, isSameDay } from '../chatTime';

describe('chatTime', () => {
  const NOW = new Date('2026-07-29T15:30:00');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatConversationTime', () => {
    it('retorna HH:mm para hoje', () => {
      expect(formatConversationTime('2026-07-29T09:05:00')).toBe('09:05');
    });

    it('retorna "Ontem" para ontem', () => {
      expect(formatConversationTime('2026-07-28T22:00:00')).toBe('Ontem');
    });

    it('retorna dia da semana para menos de 7 dias', () => {
      // 2026-07-24 é sexta-feira
      expect(formatConversationTime('2026-07-24T10:00:00').toLowerCase()).toContain('sex');
    });

    it('retorna data dd/mm/aa para mais de 7 dias', () => {
      expect(formatConversationTime('2026-06-01T10:00:00')).toMatch(/01\/06\/\d{2}/);
    });

    it('retorna vazio para valor ausente ou inválido', () => {
      expect(formatConversationTime(undefined)).toBe('');
      expect(formatConversationTime('not-a-date')).toBe('');
    });
  });

  describe('formatDayLabel', () => {
    it('retorna "Hoje" para hoje', () => {
      expect(formatDayLabel('2026-07-29T01:00:00')).toBe('Hoje');
    });

    it('retorna "Ontem" para ontem', () => {
      expect(formatDayLabel('2026-07-28T23:59:00')).toBe('Ontem');
    });

    it('retorna data por extenso para dias anteriores', () => {
      const label = formatDayLabel('2026-07-20T10:00:00');
      expect(label).toContain('20');
      expect(label.toLowerCase()).toContain('jul');
    });
  });

  describe('isSameDay', () => {
    it('true para mesmo dia', () => {
      expect(isSameDay('2026-07-29T00:01:00', '2026-07-29T23:59:00')).toBe(true);
    });

    it('false para dias diferentes', () => {
      expect(isSameDay('2026-07-28T23:59:00', '2026-07-29T00:01:00')).toBe(false);
    });
  });
});
