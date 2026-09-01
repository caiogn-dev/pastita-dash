import React from 'react';
import { render, screen } from '@testing-library/react';
import { RankBarList } from '../../reports/RankBarList';

/**
 * O dia que não vende é o que mais importa — e era o único que sumia.
 *
 * 01/set/2026, home da Cê Saladas. O alerta dizia, em vermelho:
 *
 *     ⚠ 8 dias sem venda nenhuma nos últimos 28. O pior dia é domingo.
 *
 * E a lista "MÉDIA POR DIA DA SEMANA" logo abaixo mostrava seis dias:
 * segunda, terça, quinta, sexta, quarta, sábado. Domingo não estava lá.
 *
 * O backend mandava `weekday_avg` COM domingo (0.0) e o `ForecastPanel` já
 * marcava dia zerado como `tone: 'danger'`. Quem apagava era o default
 * `hideZero` do `RankBarList`: correto para "top produtos" — produto que não
 * vendeu não polui ranking — e exatamente ao contrário para dia da semana,
 * onde o zero É a informação. O `tone: 'danger'` nunca chegou a renderizar:
 * o item era filtrado antes.
 *
 * O painel apontava para o domingo e escondia o domingo.
 */

const DIAS = [
  { label: 'segunda', value: 421.85, tone: 'brand' as const },
  { label: 'sábado', value: 23.75, tone: 'brand' as const },
  { label: 'domingo', value: 0, tone: 'danger' as const },
];

describe('média por dia da semana', () => {
  it('mostra o dia que faturou zero quando pedido', () => {
    render(<RankBarList items={DIAS} hideZero={false} />);
    expect(screen.getByText('domingo')).toBeInTheDocument();
  });

  it('o zero aparece como valor, não como linha vazia', () => {
    // Mesmo formatador que o ForecastPanel passa.
    const money = (v: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    render(<RankBarList items={DIAS} hideZero={false} valueFormat={money} />);
    expect(screen.getByText(/0,00/)).toBeInTheDocument();
  });

  it('ordena o dia zerado por último, sem sumir com ele', () => {
    const { container } = render(<RankBarList items={DIAS} hideZero={false} />);
    const rotulos = [...container.querySelectorAll('div > span:first-child')]
      .map((e) => e.textContent?.trim())
      .filter((t) => DIAS.some((d) => d.label === t));
    expect(rotulos[rotulos.length - 1]).toBe('domingo');
  });

  it('top produtos continua escondendo o que não vendeu', () => {
    // O default existe por um bom motivo e não pode mudar junto.
    render(
      <RankBarList
        items={[
          { label: 'Queridinha', value: 1063.7 },
          { label: 'Nunca vendido', value: 0 },
        ]}
      />,
    );
    expect(screen.getByText('Queridinha')).toBeInTheDocument();
    expect(screen.queryByText('Nunca vendido')).toBeNull();
  });
});
