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
