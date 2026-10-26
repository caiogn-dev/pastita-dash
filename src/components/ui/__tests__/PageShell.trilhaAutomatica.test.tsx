import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageShell } from '../PageShell';
import { TrilhaAutomatica } from '../trilhaAutomatica';

/**
 * A trilha automática nunca foi ligada (26/10): `trilhaDoCaminho` só existia
 * nos testes, e cada página escrevia a sua à mão — 30 trilhas que ficaram
 * mentindo quando o menu mudou. A casca agora entrega a trilha do menu e a
 * página só escreve a dela quando vai mais fundo que o menu (ex.: Combos › Novo).
 */
const montar = (ui: React.ReactNode, automatica = [{ rotulo: 'Marketing' }, { rotulo: 'Cupons' }]) =>
  render(
    <MemoryRouter>
      <TrilhaAutomatica.Provider value={automatica}>{ui}</TrilhaAutomatica.Provider>
    </MemoryRouter>,
  );

it('sem trilha própria, a página mostra a trilha do menu', () => {
  montar(<PageShell titulo="Cupons">x</PageShell>);
  const trilha = screen.getByRole('navigation', { name: /trilha/i });
  expect(trilha).toHaveTextContent('Marketing');
  expect(trilha).toHaveTextContent('Cupons');
});

it('a trilha escrita pela página vence a automática', () => {
  montar(<PageShell titulo="Novo combo" trilha={[{ rotulo: 'Combos', href: '/c' }, { rotulo: 'Novo' }]}>x</PageShell>);
  const trilha = screen.getByRole('navigation', { name: /trilha/i });
  expect(trilha).toHaveTextContent('Combos');
  expect(trilha).not.toHaveTextContent('Marketing');
});

it('fora da casca (sem provedor) não inventa trilha', () => {
  render(<MemoryRouter><PageShell titulo="Solta">x</PageShell></MemoryRouter>);
  expect(screen.queryByRole('navigation', { name: /trilha/i })).not.toBeInTheDocument();
});
