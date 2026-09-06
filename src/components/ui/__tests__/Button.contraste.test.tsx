/**
 * Botão que não parece botão, e texto que não dá para ler.
 *
 * O dono: "BOTOES SEM FUNDO E O TEXTO ILEGIVEL OU NAO TAO ACESSIVEL".
 *
 * São três defeitos distintos, todos verdadeiros no código:
 *
 * 1. `outline` e `secondary` não pintavam fundo nenhum. Dentro de um `Card`
 *    — que já é `bg-surface` — sobra só uma borda de 1px, e o controle deixa
 *    de ler como algo clicável. Não é gosto: é o affordance sumindo.
 *
 * 2. `ghost` usava `text-fg-muted-token`, a cor de texto SECUNDÁRIO. Cinza
 *    claro sobre fundo claro passa longe dos 4.5:1 da WCAG AA, e ghost é
 *    justamente a variante das ações de tabela — "Editar", "Duplicar".
 *
 * 3. `solid` — o alias legado — ficou com `text-white` sobre o ouro da marca.
 *    O comentário logo acima de `primary` diz, com número medido, que isso dá
 *    2.40:1 no claro e 1.79:1 no escuro. A correção nunca desceu para o alias,
 *    então metade do painel continuava com o contraste reprovado.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import { Button } from '../Button';

const classesDe = (rotulo: string) =>
  screen.getByRole('button', { name: rotulo }).className;

/** `hover:bg-surface-2` contém "bg-surface": a classe tem que estar SOZINHA. */
const temClasse = (rotulo: string, classe: string) =>
  classesDe(rotulo).split(/\s+/).includes(classe);

describe('contraste e affordance do botão', () => {
  it('outline tem fundo próprio — sobre um Card, só a borda some', () => {
    render(<Button variant="outline">Editar</Button>);

    expect(temClasse('Editar', 'bg-surface')).toBe(true);
  });

  it('secondary, que é o mesmo botão com nome antigo, também', () => {
    render(<Button variant="secondary">Cancelar</Button>);

    expect(temClasse('Cancelar', 'bg-surface')).toBe(true);
  });

  it('ghost usa a cor de texto PRINCIPAL, não a de legenda', () => {
    render(<Button variant="ghost">Duplicar</Button>);

    const classes = classesDe('Duplicar');
    expect(classes).toMatch(/text-fg-token/);
    expect(classes).not.toMatch(/text-fg-muted-token/);
  });

  it('nenhuma variante de marca escreve em branco sobre o ouro', () => {
    // O ouro da marca é claro. Branco em cima dele reprova na AA, e este é o
    // teste que impede a regressão voltar por um alias esquecido.
    for (const variant of ['primary', 'solid'] as const) {
      const { unmount } = render(<Button variant={variant}>Salvar</Button>);
      expect(classesDe('Salvar')).not.toMatch(/text-white/);
      unmount();
    }
  });
});
