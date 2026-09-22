/**
 * O estado do item é UM controle, não dois botões coloridos.
 *
 * Cada linha do cardápio repetia "Pausado | Ativo" em vermelho e verde fortes.
 * Numa lista de 75 produtos isso são 150 botões coloridos disputando a
 * atenção — e o vermelho, que no resto do painel significa erro, aqui
 * significa só "pausado". É o maior ruído da tela.
 *
 * Um switch diz a mesma coisa com um toque e sem gritar.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusToggle, FeaturedToggle } from '../InlineToggle';

describe('StatusToggle', () => {
  it('é um switch, com o estado no nome acessível', () => {
    render(<StatusToggle active nome="Combo Tilápia" onChange={jest.fn()} />);

    const sw = screen.getByRole('switch', { name: 'Combo Tilápia está ativo no cardápio' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('pausado diz que está pausado', () => {
    render(<StatusToggle active={false} nome="Combo Tilápia" onChange={jest.fn()} />);

    expect(
      screen.getByRole('switch', { name: 'Combo Tilápia está pausado' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('um toque alterna', () => {
    const onChange = jest.fn();
    render(<StatusToggle active={false} nome="X" onChange={onChange} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('sem nome do item, ainda dá para usar', () => {
    render(<StatusToggle active onChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Ativo no cardápio' })).toBeInTheDocument();
  });
});

describe('FeaturedToggle', () => {
  it('alterna e diz o que faz', () => {
    const onChange = jest.fn();
    render(<FeaturedToggle featured={false} nome="Combo Tilápia" onChange={onChange} />);

    const botao = screen.getByRole('button', { name: 'Destacar Combo Tilápia no cardápio' });
    fireEvent.click(botao);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('já destacado oferece tirar o destaque', () => {
    render(<FeaturedToggle featured nome="Combo Tilápia" onChange={jest.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Tirar Combo Tilápia do destaque' }),
    ).toBeInTheDocument();
  });
});
