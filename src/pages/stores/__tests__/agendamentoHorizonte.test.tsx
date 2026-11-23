/** Data futura (Ivoneth, 23/11): o dono escolhe até quantos dias o cliente agenda. */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AgendamentoCampos from '../AgendamentoCampos';
import { AGENDAMENTO_PADRAO, HORIZONTES, lerAgendamento } from '../horarios';

describe('horizonte do agendamento', () => {
  it('padrão continua 7 dias', () => {
    expect(AGENDAMENTO_PADRAO.dias).toBe(7);
    expect(lerAgendamento({}).dias).toBe(7);
  });

  it('lê o que o dono gravou e ignora valor fora da lista', () => {
    expect(lerAgendamento({ agendamento: { dias: 60 } }).dias).toBe(60);
    expect(lerAgendamento({ agendamento: { dias: 500 } }).dias).toBe(7);
    expect(lerAgendamento({ agendamento: { dias: '60' } }).dias).toBe(7);
  });

  it('opções vão até 90 dias (teto do servidor)', () => {
    expect(Math.max(...HORIZONTES)).toBe(90);
    expect(HORIZONTES).toContain(7);
  });

  it('o card deixa escolher até quando aceita pedidos', () => {
    const onChange = jest.fn();
    render(<AgendamentoCampos valor={AGENDAMENTO_PADRAO} onChange={onChange} horas={{}} />);
    fireEvent.click(screen.getByRole('radio', { name: '60 dias' }));
    expect(onChange).toHaveBeenCalledWith({ ...AGENDAMENTO_PADRAO, dias: 60 });
  });
});
