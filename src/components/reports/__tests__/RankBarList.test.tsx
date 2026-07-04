import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RankBarList, type RankBarItem } from '../RankBarList';

const items: RankBarItem[] = [
  { label: 'Entregue', value: 12 },
  { label: 'Pendente', value: 3 },
  { label: 'Cancelado', value: 0, tone: 'danger' },
];

describe('RankBarList', () => {
  it('ordena por valor desc e esconde itens zerados por padrão', () => {
    render(<RankBarList items={items} />);
    const labels = screen.getAllByTitle(/./).map((el) => el.textContent);
    expect(labels).toEqual(['Entregue', 'Pendente']); // Cancelado (0) escondido
    expect(screen.queryByText('Cancelado')).not.toBeInTheDocument();
  });

  it('mostra zerados quando hideZero=false', () => {
    render(<RankBarList items={items} hideZero={false} />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('respeita o limite max mantendo os maiores', () => {
    render(<RankBarList items={items} max={1} />);
    expect(screen.getByText('Entregue')).toBeInTheDocument();
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('formata o valor com valueFormat', () => {
    render(<RankBarList items={[{ label: 'Receita', value: 1500 }]} valueFormat={(v) => `R$ ${v}`} />);
    expect(screen.getByText('R$ 1500')).toBeInTheDocument();
  });

  it('mostra mensagem de vazio quando não há dados visíveis', () => {
    render(<RankBarList items={[{ label: 'X', value: 0 }]} />);
    expect(screen.getByText(/Sem dados no período/i)).toBeInTheDocument();
  });
});
