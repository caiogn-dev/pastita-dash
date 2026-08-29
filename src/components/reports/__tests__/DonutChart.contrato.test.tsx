import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DonutChart } from '../DonutChart';

/**
 * Contrato do DonutChart, escrito ANTES de tirar o recharts. Um consumidor
 * (SalesSections) e nenhuma prop pode mudar de significado.
 */
const FATIAS = [
  { name: 'WhatsApp', value: 60 },
  { name: 'Cardápio', value: 30 },
  { name: 'Balcão', value: 10 },
];

describe('donut de participação', () => {
  it('desenha uma fatia por item', () => {
    const { container } = render(<DonutChart data={FATIAS} />);
    expect(container.querySelectorAll('[data-fatia]')).toHaveLength(3);
  });

  it('ignora fatia zerada — 0% não é participação', () => {
    const { container } = render(
      <DonutChart data={[...FATIAS, { name: 'Vazio', value: 0 }]} />,
    );
    expect(container.querySelectorAll('[data-fatia]')).toHaveLength(3);
  });

  it('sem fatia nenhuma, não desenha nada', () => {
    const { container } = render(<DonutChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('uma fatia só vira o anel inteiro', () => {
    const { container } = render(<DonutChart data={[{ name: 'Só', value: 5 }]} />);
    expect(container.querySelectorAll('[data-fatia]')).toHaveLength(1);
  });

  it('mostra o rótulo central e o subtítulo', () => {
    render(<DonutChart data={FATIAS} centerLabel="R$ 100" centerSub="no período" />);
    expect(screen.getByText('R$ 100')).toBeInTheDocument();
    expect(screen.getByText('no período')).toBeInTheDocument();
  });

  it('respeita a altura pedida', () => {
    const { container } = render(<DonutChart data={FATIAS} height={220} />);
    expect((container.firstChild as HTMLElement).style.height).toBe('220px');
  });

  it('passar o mouse numa fatia diz qual é e quanto vale', () => {
    const { container } = render(
      <DonutChart data={FATIAS} valueFormat={(v) => `R$ ${v}`} />,
    );
    fireEvent.mouseEnter(container.querySelectorAll('[data-fatia]')[0]);
    const dica = screen.getByRole('tooltip');
    expect(dica).toHaveTextContent('WhatsApp');
    expect(dica).toHaveTextContent('R$ 60');
  });

  it('descreve a participação para leitor de tela', () => {
    render(<DonutChart data={FATIAS} />);
    expect(screen.getByRole('img', { name: /WhatsApp/ })).toBeInTheDocument();
  });
});
