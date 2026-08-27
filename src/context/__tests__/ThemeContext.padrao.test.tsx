import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

// jsdom nao implementa matchMedia; o provider consulta para resolver 'system'.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
});

// A marca é Dark Luxe e o login é carvão com ouro — mas o painel abria no
// tema claro, então o lojista via duas linguagens em dois cliques.
//
// O claro não é malfeito: é contido de propósito. O ouro #C9A24B dá 2,08:1
// sobre fundo claro e reprovaria em AA como texto, por isso existe o
// --brand-ink #846828. O efeito colateral correto é um ouro que quase não
// aparece. No escuro o mesmo ouro dá 10:1 e a marca pode se mostrar.

const Espiao = () => {
  const { theme } = useTheme();
  return <span data-testid="tema">{theme}</span>;
};

const renderizar = () => render(<ThemeProvider><Espiao /></ThemeProvider>);

describe('tema padrão do painel', () => {
  beforeEach(() => localStorage.clear());

  it('abre no escuro para quem nunca escolheu — é a linguagem da marca', () => {
    renderizar();
    expect(screen.getByTestId('tema')).toHaveTextContent('dark');
  });

  it('respeita a escolha já salva pelo lojista', () => {
    localStorage.setItem('cardapidex-theme', 'light');
    renderizar();
    expect(screen.getByTestId('tema')).toHaveTextContent('light');
  });

  it('respeita a escolha por "system"', () => {
    localStorage.setItem('cardapidex-theme', 'system');
    renderizar();
    expect(screen.getByTestId('tema')).toHaveTextContent('system');
  });

  it('ignora valor inválido no armazenamento e cai no padrão', () => {
    localStorage.setItem('cardapidex-theme', 'roxo');
    renderizar();
    expect(screen.getByTestId('tema')).toHaveTextContent('dark');
  });
});
