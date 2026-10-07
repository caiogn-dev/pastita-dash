/**
 * Paleta (Ctrl+K): o foco volta para onde estava, e Esc fecha de qualquer
 * ponto dela.
 *
 * Antes: fechar a paleta largava o foco no <body> — quem abriu pelo botão
 * "Ir para…" e desistiu com Esc recomeçava a tabulação do topo da página. E
 * Esc só funcionava com o foco no campo: um clique na lista (fora de um
 * resultado) tirava o foco do campo e a paleta parava de fechar pelo teclado.
 */
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CommandPalette } from '../CommandPalette';
import { buildNavSections } from '../navSections';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: false,
});

const Casca: React.FC = () => {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        Ir para
      </button>
      <CommandPalette aberto={aberto} onFechar={() => setAberto(false)} sections={sections} onNavegar={jest.fn()} />
    </>
  );
};

it('Esc devolve o foco ao botão que abriu a paleta', () => {
  render(<Casca />);
  const botao = screen.getByRole('button', { name: 'Ir para' });
  botao.focus();
  fireEvent.click(botao);
  expect(screen.getByRole('combobox')).toHaveFocus();

  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(botao).toHaveFocus();
});

it('Esc fecha mesmo com o foco fora do campo', () => {
  render(<Casca />);
  fireEvent.click(screen.getByRole('button', { name: 'Ir para' }));
  const dialogo = screen.getByRole('dialog');
  fireEvent.keyDown(dialogo, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
