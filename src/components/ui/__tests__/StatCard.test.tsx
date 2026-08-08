import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatCard } from '../StatCard';

describe('StatCard (canônico)', () => {
  it('mostra label e value', () => {
    render(<StatCard label="Pedidos hoje" value={42} />);
    expect(screen.getByText('Pedidos hoje')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('mostra sub quando fornecido', () => {
    render(<StatCard label="Receita" value="R$ 100" sub="+10% vs ontem" />);
    expect(screen.getByText('+10% vs ontem')).toBeInTheDocument();
  });

  it('é clicável e dispara onClick', () => {
    const onClick = jest.fn();
    render(<StatCard label="Clique" value={1} onClick={onClick} />);
    fireEvent.click(screen.getByText('Clique'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('aplica cursor-pointer quando há onClick', () => {
    const { container } = render(
      <StatCard label="X" value={1} onClick={() => {}} />
    );
    expect(container.firstChild).toHaveClass('cursor-pointer');
  });
});

describe('StatCard — dia que não começou não é queda', () => {
  it('valor zerado com -100% vira neutro, não alarme vermelho', () => {
    // Às 8h da manhã a receita de hoje é R$ 0 e o comparativo devolve -100%.
    // O card pintava "▼ 100,0% vs ontem" em vermelho: a primeira coisa que o
    // dono via ao abrir o painel era um alarme sobre um dia que ainda nem
    // aconteceu. Alarme que aparece todo dia às 8h ninguém lê.
    render(
      <StatCard
        label="Receita hoje"
        value="R$ 0,00"
        comparativo={{ variacaoPct: -100, rotulo: 'vs ontem' }}
      />
    );
    expect(screen.getByText(/ainda sem movimento hoje/i)).toBeInTheDocument();
    expect(screen.queryByText(/100/)).not.toBeInTheDocument();
  });

  it('queda de verdade continua vermelha', () => {
    // O sinal precisa continuar valendo quando há dado real.
    render(
      <StatCard
        label="Receita hoje"
        value="R$ 320,00"
        comparativo={{ variacaoPct: -42, rotulo: 'vs ontem' }}
      />
    );
    expect(screen.getByText(/42\.0%/)).toBeInTheDocument();
  });

  it('zero com queda parcial não é silenciado', () => {
    // -30% com valor zerado seria dado inconsistente; só o -100% exato é o
    // caso do dia não começado.
    render(
      <StatCard label="x" value={0} comparativo={{ variacaoPct: -30, rotulo: 'vs ontem' }} />
    );
    expect(screen.getByText(/30\.0%/)).toBeInTheDocument();
  });
});
