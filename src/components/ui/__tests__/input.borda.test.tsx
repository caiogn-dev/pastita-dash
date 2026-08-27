import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from '../input';

// A borda do campo foi decidida, comentada e TESTADA no token: `--border-input`
// (#776047) existe porque a `--border` decorativa dá 1,38:1 e WCAG 1.4.11 exige
// 3:1 para o limite de um controle. `contraste.test.ts` guarda esse número.
//
// Só que a classe pedida era `border-input`, e o Tailwind não gera essa: a chave
// de cor chama-se `border-input`, então o utilitário é `border-border-input`.
// A classe morta caía no cinza padrão do Tailwind — o contraste testado nunca
// chegou à tela, em 55 arquivos que usam este componente.

describe('borda do campo', () => {
  it('usa a classe que o Tailwind realmente gera para o token de borda', () => {
    render(<Input placeholder="Digite" />);
    expect(screen.getByPlaceholderText('Digite').className).toMatch(/border-border-input/);
  });

  it('não pede a classe morta `border-input`', () => {
    render(<Input placeholder="Digite" />);
    const classes = screen.getByPlaceholderText('Digite').className.split(/\s+/);
    expect(classes).not.toContain('border-input');
  });
});
