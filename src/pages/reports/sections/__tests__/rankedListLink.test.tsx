/**
 * Relatório que aponta um problema precisa levar até ele.
 *
 * A seção CRM sabe quem está EM RISCO e quem já se PERDEU — a informação mais
 * acionável do painel inteiro. E não tinha um link: o dono lia "Fulana, em
 * risco, último pedido há 28 dias", e para agir precisava decorar o nome, ir
 * em Clientes e procurar na mão.
 *
 * Número sem verbo é decoração. A linha vira caminho.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RankedList } from '../shared';

const renderizar = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('RankedList — a linha leva a algum lugar', () => {
  it('vira link quando o item tem href', () => {
    renderizar(<RankedList items={[
      { label: 'Leani Rodrigues', value: 347, href: '/customers?busca=63992618115' },
    ]} />);

    const link = screen.getByRole('link', { name: /Leani Rodrigues/ });
    expect(link).toHaveAttribute('href', '/customers?busca=63992618115');
  });

  it('continua sendo texto quando não há para onde ir', () => {
    // Ranking de produto não tem ficha para abrir: virar link seria prometer
    // um destino que não existe.
    renderizar(<RankedList items={[{ label: 'Queridinha', value: 12 }]} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Queridinha')).toBeInTheDocument();
  });

  it('o link nao engole o resto da linha — badge e valor seguem visiveis', () => {
    renderizar(<RankedList items={[{
      label: 'Dyana', value: 320, valueLabel: 'R$ 320,93',
      badge: <span>Em risco</span>, href: '/customers?busca=63984143551',
    }]} />);

    expect(screen.getByRole('link', { name: /Dyana/ })).toBeInTheDocument();
    expect(screen.getByText('Em risco')).toBeInTheDocument();
    expect(screen.getByText('R$ 320,93')).toBeInTheDocument();
  });
});
