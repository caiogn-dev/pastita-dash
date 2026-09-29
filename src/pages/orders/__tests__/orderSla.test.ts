import { getStageStart, getAvgPrepMinutes, situacaoDoPreparo } from '../orderSla';


describe('orderSla', () => {
  describe('getStageStart', () => {
    it('pedido em preparo conta desde preparing_at', () => {
      const order = {
        status: 'preparing',
        created_at: '2026-06-11T11:00:00Z',
        confirmed_at: '2026-06-11T11:10:00Z',
        preparing_at: '2026-06-11T11:20:00Z',
      };
      expect(getStageStart(order as never)).toBe('2026-06-11T11:20:00Z');
    });

    it('em preparo sem preparing_at cai para confirmed_at', () => {
      const order = {
        status: 'preparing',
        created_at: '2026-06-11T11:00:00Z',
        confirmed_at: '2026-06-11T11:10:00Z',
      };
      expect(getStageStart(order as never)).toBe('2026-06-11T11:10:00Z');
    });

    it('pendente conta desde created_at', () => {
      const order = { status: 'pending', created_at: '2026-06-11T11:00:00Z' };
      expect(getStageStart(order as never)).toBe('2026-06-11T11:00:00Z');
    });

    it('confirmado conta desde confirmed_at', () => {
      const order = {
        status: 'confirmed',
        created_at: '2026-06-11T11:00:00Z',
        confirmed_at: '2026-06-11T11:10:00Z',
      };
      expect(getStageStart(order as never)).toBe('2026-06-11T11:10:00Z');
    });
  });

  describe('getAvgPrepMinutes', () => {
    it('média de ready_at - confirmed_at dos pedidos com ambos timestamps', () => {
      const orders = [
        { confirmed_at: '2026-06-11T10:00:00Z', ready_at: '2026-06-11T10:20:00Z' }, // 20min
        { confirmed_at: '2026-06-11T10:00:00Z', ready_at: '2026-06-11T10:40:00Z' }, // 40min
        { confirmed_at: '2026-06-11T10:00:00Z' }, // sem ready_at — ignora
        { ready_at: '2026-06-11T10:30:00Z' }, // sem confirmed_at — ignora
      ];
      expect(getAvgPrepMinutes(orders as never)).toBe(30);
    });

    it('sem dados suficientes retorna null', () => {
      expect(getAvgPrepMinutes([] as never)).toBeNull();
      expect(getAvgPrepMinutes([{ confirmed_at: '2026-06-11T10:00:00Z' }] as never)).toBeNull();
    });

    it('ignora duração negativa (timestamps inconsistentes)', () => {
      const orders = [
        { confirmed_at: '2026-06-11T10:30:00Z', ready_at: '2026-06-11T10:00:00Z' }, // negativo
        { confirmed_at: '2026-06-11T10:00:00Z', ready_at: '2026-06-11T10:10:00Z' }, // 10min
      ];
      expect(getAvgPrepMinutes(orders as never)).toBe(10);
    });
  });
});

describe('situacaoDoPreparo', () => {
  const agora = new Date('2026-09-14T12:00:00Z').getTime();

  it('em preparo com previsão no futuro: no prazo', () => {
    const r = situacaoDoPreparo({ status: 'preparing', prep_due_at: '2026-09-14T12:10:00Z' }, agora);
    expect(r).toEqual({ previstoPara: '2026-09-14T12:10:00Z', atrasadoMin: 0, faltamMin: 10 });
  });

  it('passou da previsão: atrasado em minutos', () => {
    const r = situacaoDoPreparo({ status: 'preparing', prep_due_at: '2026-09-14T11:45:00Z' }, agora);
    expect(r?.atrasadoMin).toBe(15);
    expect(r?.faltamMin).toBe(0);
  });

  it('sem previsão (loja sem tempo padrão) não inventa nada', () => {
    expect(situacaoDoPreparo({ status: 'preparing', prep_due_at: null }, agora)).toBeNull();
  });

  it('fora do preparo a previsão não se aplica', () => {
    expect(situacaoDoPreparo({ status: 'out_for_delivery', prep_due_at: '2026-09-14T11:45:00Z' }, agora)).toBeNull();
  });

  it('data inválida não quebra o quadro', () => {
    expect(situacaoDoPreparo({ status: 'preparing', prep_due_at: 'lixo' }, agora)).toBeNull();
  });
});

import { prazoDoAgendado } from '../orderSla';

describe('preparo médio sem distorção de agendado', () => {
  it('ignora pedido agendado e tempo que não é de cozinha (> 4 h); usa a mediana', () => {
    const base = { status: 'ready', created_at: '2026-09-29T10:00:00Z' };
    const orders = [
      { ...base, confirmed_at: '2026-09-29T10:00:00Z', ready_at: '2026-09-29T10:20:00Z' },            // 20
      { ...base, confirmed_at: '2026-09-29T11:00:00Z', ready_at: '2026-09-29T11:30:00Z' },            // 30
      { ...base, confirmed_at: '2026-09-29T12:00:00Z', ready_at: '2026-09-29T12:25:00Z' },            // 25
      { ...base, confirmed_at: '2026-09-26T09:00:00Z', ready_at: '2026-09-29T09:00:00Z', scheduled_date: '2026-09-29' }, // agendado: fora
      { ...base, confirmed_at: '2026-09-28T09:00:00Z', ready_at: '2026-09-29T09:00:00Z' },            // 24 h: esqueceram de avançar
    ];
    expect(getAvgPrepMinutes(orders as never)).toBe(25);
  });
  it('usa preparing_at → ready_at quando existe (tempo real de cozinha)', () => {
    const o = { status: 'ready', created_at: '2026-09-29T10:00:00Z', confirmed_at: '2026-09-29T10:00:00Z', preparing_at: '2026-09-29T10:40:00Z', ready_at: '2026-09-29T10:55:00Z' };
    expect(getAvgPrepMinutes([o] as never)).toBe(15);
  });
});

describe('prazoDoAgendado', () => {
  const agora = new Date('2026-09-29T15:00:00-03:00');
  it('agendado para depois: faltam N min e não é atraso', () => {
    const p = prazoDoAgendado({ status: 'confirmed', scheduled_date: '2026-09-30', scheduled_time: '14:00:00' } as never, agora);
    expect(p).toEqual({ faltamMin: 23 * 60, atrasadoMin: 0 });
  });
  it('horário do agendado passou e não saiu da etapa: atraso conta do horário, não da criação', () => {
    const p = prazoDoAgendado({ status: 'confirmed', scheduled_date: '2026-09-29', scheduled_time: '14:30:00' } as never, agora);
    expect(p).toEqual({ faltamMin: 0, atrasadoMin: 30 });
  });
  it('sem agendamento, ou já em preparo, não se aplica', () => {
    expect(prazoDoAgendado({ status: 'confirmed' } as never, agora)).toBeNull();
    expect(prazoDoAgendado({ status: 'preparing', scheduled_date: '2026-09-29', scheduled_time: '14:30:00' } as never, agora)).toBeNull();
  });
});

describe('prazoDoAgendado com faixa de horário ("10:00-12:00", formato real do banco)', () => {
  const pedido = (hora: string) => ({ status: 'confirmed', scheduled_date: '2026-09-29', scheduled_time: hora }) as never;
  it('antes da faixa: faltam até o início', () => {
    expect(prazoDoAgendado(pedido('10:00-12:00'), new Date('2026-09-29T09:00:00-03:00'))).toEqual({ faltamMin: 60, atrasadoMin: 0 });
  });
  it('dentro da faixa: nem falta nem atraso', () => {
    expect(prazoDoAgendado(pedido('10:00-12:00'), new Date('2026-09-29T11:00:00-03:00'))).toEqual({ faltamMin: 0, atrasadoMin: 0 });
  });
  it('depois da faixa: atraso conta do FIM da faixa', () => {
    expect(prazoDoAgendado(pedido('10:00-12:00'), new Date('2026-09-29T12:45:00-03:00'))).toEqual({ faltamMin: 0, atrasadoMin: 45 });
  });
  it('horário ilegível não vira NaN', () => {
    expect(prazoDoAgendado(pedido('manhã'), new Date('2026-09-29T12:45:00-03:00'))).toBeNull();
  });
});
