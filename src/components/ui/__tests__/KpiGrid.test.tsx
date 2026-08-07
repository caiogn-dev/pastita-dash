/**
 * KpiGrid — a definição do indicador é obrigatória, não enfeite.
 *
 * "Faturamento R$ 1.557,04" não diz se inclui frete, se conta pedido
 * cancelado, se é do dia do pagamento ou do dia do pedido. O dono descobre
 * errado, reclama, e a gente audita o backend por nada — aconteceu.
 *
 * A `definicao` fica IMPRESSA no card, não escondida num tooltip que ninguém
 * abre no celular. O grid existe para que nenhuma página invente sua própria
 * quantidade de colunas.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { KpiGrid } from '../KpiGrid';

const KPIS = [
  {
    label: 'Faturamento bruto',
    value: 'R$ 3.661,32',
    definicao: 'Total vendido no período, antes de descontos.',
  },
  {
    label: 'Ticket médio',
    value: 'R$ 205,35',
    definicao: 'Faturamento ÷ pedidos confirmados.',
    comparativo: { variacaoPct: 8.8, rotulo: 'vs mês anterior' },
  },
];

describe('KpiGrid', () => {
  it('imprime a definição de cada indicador na tela', () => {
    render(<KpiGrid itens={KPIS} />);
    expect(screen.getByText('Total vendido no período, antes de descontos.')).toBeInTheDocument();
    expect(screen.getByText('Faturamento ÷ pedidos confirmados.')).toBeInTheDocument();
  });

  it('o comparativo nomeia a base de comparação', () => {
    // "+8,8%" sozinho não informa contra o quê.
    render(<KpiGrid itens={KPIS} />);
    expect(screen.getByText('vs mês anterior')).toBeInTheDocument();
  });

  it('lista vazia não renderiza grid', () => {
    const { container } = render(<KpiGrid itens={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
