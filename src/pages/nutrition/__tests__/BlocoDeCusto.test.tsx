import { render, screen } from '@testing-library/react';
import BlocoDeCusto from '../BlocoDeCusto';

const completo = {
  custo_total: '7.50', custo_por_porcao: '2.50', ingredientes_sem_preco: [],
  preco_de_venda: '25.00', margem_bruta_valor: '17.50', margem_bruta_pct: '70.0', cmv_pct: '30.0',
};

test('mostra custo, porção, preço, margem e CMV do prato', () => {
  render(<BlocoDeCusto custo={completo} />);
  expect(screen.getByText('Custo e margem')).toBeInTheDocument();
  expect(screen.getByText('R$ 7,50')).toBeInTheDocument();
  expect(screen.getByText('R$ 2,50')).toBeInTheDocument();
  expect(screen.getByText('R$ 25,00')).toBeInTheDocument();
  expect(screen.getByText(/R\$ 17,50/)).toBeInTheDocument();
  expect(screen.getByText(/70,0\s?%/)).toBeInTheDocument();
  expect(screen.getByText(/30,0\s?%/)).toBeInTheDocument();
});

test('sem preço de algum ingrediente, não mostra custo inventado e diz quem falta', () => {
  render(<BlocoDeCusto custo={{ ...completo, custo_total: null, custo_por_porcao: null,
    margem_bruta_valor: null, margem_bruta_pct: null, cmv_pct: null,
    ingredientes_sem_preco: ['Alface', 'Molho da casa'] }} />);
  expect(screen.getByText(/Sem preço:/)).toHaveTextContent('Alface e Molho da casa');
  expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
});

test('margem negativa aparece como prejuízo', () => {
  render(<BlocoDeCusto custo={{ ...completo, margem_bruta_valor: '-2.00', margem_bruta_pct: '-8.0', cmv_pct: '108.0' }} />);
  expect(screen.getByText(/prejuízo/i)).toBeInTheDocument();
});
