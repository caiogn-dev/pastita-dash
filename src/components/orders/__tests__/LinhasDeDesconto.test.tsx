/**
 * Detalhe do pedido: cupom, resgate e cashback em linhas próprias.
 * Antes: "Cupom" sem valor, cashback, e um "Desconto" somado — o resgate da
 * fidelidade não aparecia como resgate (dono, 19/10).
 */
import { render, screen } from '@testing-library/react';
import { LinhasDeDesconto } from '../LinhasDeDesconto';

const formatar = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

describe('LinhasDeDesconto', () => {
  it('uma linha por origem, com o valor de cada uma', () => {
    render(
      <dl>
        <LinhasDeDesconto
          descontos={[
            { tipo: 'cupom', rotulo: 'Cupom NUTRI.TANIA', valor: '4.35', codigo: 'NUTRI.TANIA' },
            { tipo: 'fidelidade', rotulo: 'Resgate fidelidade', valor: '36.99', item: 'Queridinha' },
            { tipo: 'cashback', rotulo: 'Cashback usado', valor: '1.50' },
          ]}
          formatar={formatar}
        />
      </dl>,
    );
    expect(screen.getByText('NUTRI.TANIA')).toBeInTheDocument();
    expect(screen.getByText('-R$ 4,35')).toBeInTheDocument();
    expect(screen.getByText(/Queridinha grátis/)).toBeInTheDocument();
    expect(screen.getByText('-R$ 36,99')).toBeInTheDocument();
    expect(screen.getByText('Cashback usado')).toBeInTheDocument();
  });

  it('sem lista não desenha nada (a tela cai no "Desconto" antigo)', () => {
    const { container } = render(<dl><LinhasDeDesconto descontos={[]} formatar={formatar} /></dl>);
    expect(container.querySelector('dt')).toBeNull();
  });
});
