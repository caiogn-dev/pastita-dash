/**
 * Sem paginador, a lista MENTE por omissão.
 *
 * A Cê Saladas tem 35 cupons; a tela carregava a primeira página do backend —
 * 20 — e não desenhava nada dizendo que existiam mais. O dono procurava um
 * cupom que ele mesmo tinha criado, não achava, e a conclusão razoável é que a
 * plataforma perdeu o cupom. Nenhum erro aparecia em lugar nenhum.
 *
 * Quatro páginas do painel já haviam escrito o próprio "Anterior / Próximo" à
 * mão, cada uma com um texto e um cálculo de intervalo diferente. Este é o
 * único, e ele existe para que a lista SEMPRE diga quantos itens há no total —
 * mesmo quando cabem todos numa página só.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { Paginacao } from '../Paginacao';

describe('paginador', () => {
  it('diz o intervalo e o total, que é o que responde "cadê o resto?"', () => {
    render(<Paginacao pagina={1} porPagina={20} total={35} onPagina={jest.fn()} />);

    expect(screen.getByText(/1–20 de 35/)).toBeInTheDocument();
  });

  it('na última página o intervalo para no total, não em 40', () => {
    render(<Paginacao pagina={2} porPagina={20} total={35} onPagina={jest.fn()} />);

    expect(screen.getByText(/21–35 de 35/)).toBeInTheDocument();
  });

  it('avança e volta', () => {
    const onPagina = jest.fn();
    render(<Paginacao pagina={1} porPagina={20} total={35} onPagina={onPagina} />);

    fireEvent.click(screen.getByRole('button', { name: /próxima/i }));
    expect(onPagina).toHaveBeenCalledWith(2);
  });

  it('não deixa passar do fim nem antes do começo', () => {
    render(<Paginacao pagina={2} porPagina={20} total={35} onPagina={jest.fn()} />);

    expect(screen.getByRole('button', { name: /próxima/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /anterior/i })).toBeEnabled();
  });

  it('cabendo tudo numa página, some com os botões mas MANTÉM a contagem', () => {
    // A contagem é a parte que impede a dúvida; os botões é que sobram.
    render(<Paginacao pagina={1} porPagina={20} total={7} onPagina={jest.fn()} />);

    expect(screen.getByText(/7 itens/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /próxima/i })).toBeNull();
  });

  it('lista vazia não desenha paginador nenhum', () => {
    const { container } = render(
      <Paginacao pagina={1} porPagina={20} total={0} onPagina={jest.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('aceita um rótulo próprio do que está sendo contado', () => {
    render(<Paginacao pagina={1} porPagina={20} total={7} onPagina={jest.fn()} rotulo="cupons" />);

    expect(screen.getByText(/7 cupons/)).toBeInTheDocument();
  });
});
