/**
 * O que a home e a tela de Clientes precisavam e o kit não tinha:
 *
 * - `FalhaAoCarregar`: "Não foi possível carregar X · Tentar novamente" estava
 *   escrito à mão quatro vezes, em vermelho cru do Tailwind com o par `dark:`.
 * - `Textarea`: o kit não tinha; a ficha do cliente usava `<textarea>` cru e o
 *   `common/Textarea` é cinza cru e sem rótulo.
 * - `KpiGrid` com `serie`: a home usava StatCard solto só para não perder a
 *   linha dos últimos 14 dias.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { FalhaAoCarregar } from '../FalhaAoCarregar';
import { Textarea } from '../Textarea';
import { KpiGrid } from '../KpiGrid';

describe('FalhaAoCarregar', () => {
  it('é um alerta que diz o que falhou e oferece tentar de novo', async () => {
    const tentar = jest.fn();
    render(<FalhaAoCarregar titulo="Não foi possível carregar as avaliações" onTentarDeNovo={tentar} />);
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível carregar as avaliações');
    expect(alerta).toHaveTextContent('Verifique sua conexão e tente novamente.');
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(tentar).toHaveBeenCalledTimes(1);
  });

  it('sem onTentarDeNovo não mostra botão; descrição é substituível', () => {
    render(<FalhaAoCarregar titulo="Falhou" descricao="Outra frase." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Outra frase.');
  });

  it('usa só tokens do tema', () => {
    const { container } = render(<FalhaAoCarregar titulo="Falhou" onTentarDeNovo={() => {}} />);
    expect(container.innerHTML).not.toMatch(/-(red|gray|zinc|yellow)-\d{2,3}|dark:|text-white/);
  });
});

describe('Textarea', () => {
  it('tem rótulo ligado ao campo e repassa o valor', async () => {
    const mudou = jest.fn();
    render(<Textarea label="Notas" value="" onChange={mudou} />);
    const campo = screen.getByLabelText('Notas');
    expect(campo.tagName).toBe('TEXTAREA');
    await userEvent.type(campo, 'a');
    expect(mudou).toHaveBeenCalled();
  });

  it('erro marca aria-invalid e é anunciado pelo campo', () => {
    render(<Textarea label="Notas" error="Obrigatório" />);
    const campo = screen.getByLabelText('Notas');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('Obrigatório');
  });

  it('dica aparece sob o campo quando não há erro', () => {
    render(<Textarea label="Notas" hint="Só a loja vê" />);
    expect(screen.getByLabelText('Notas')).toHaveAccessibleDescription('Só a loja vê');
  });
});

describe('KpiGrid com série', () => {
  it('repassa a série ao card, que desenha a linha dos últimos dias', () => {
    render(
      <KpiGrid
        itens={[{ label: 'Pedidos hoje', value: 3, definicao: 'todos os pedidos', serie: [1, 2, 3] }]}
      />,
    );
    expect(screen.getByRole('img', { name: /pedidos hoje: variação dos últimos 3 dias/i })).toBeInTheDocument();
  });
});
