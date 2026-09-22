/**
 * Botão e campo do mesmo tamanho têm a MESMA altura.
 *
 * Medição de 21/09: cinco alturas convivendo no painel (h-8 57×, h-10 38×,
 * h-12 37×, h-9, h-11), e as primitivas nem usavam altura — cada uma chegava
 * na sua por soma de padding. O botão "md" dava 36px e o campo "md" dava 42px:
 * lado a lado numa barra de filtros, seis pixels de desalinho. É o detalhe que
 * faz a tela parecer montada por duas pessoas.
 */
import { render, screen } from '@testing-library/react';

import { Button } from '../Button';
import { Input } from '../input';

const ALTURAS = { sm: 'h-8', md: 'h-10', lg: 'h-12' } as const;

describe('altura dos controles', () => {
  (['sm', 'md', 'lg'] as const).forEach((tamanho) => {
    it(`botão e campo "${tamanho}" usam ${ALTURAS[tamanho]}`, () => {
      render(
        <>
          <Button size={tamanho}>ok</Button>
          <Input size={tamanho} aria-label="campo" />
        </>,
      );

      expect(screen.getByRole('button').className).toContain(ALTURAS[tamanho]);
      expect(screen.getByLabelText('campo').className).toContain(ALTURAS[tamanho]);
    });
  });

  it('o rótulo do botão é semibold — 400 num botão não lê como ação', () => {
    render(<Button>ok</Button>);

    expect(screen.getByRole('button').className).toContain('font-semibold');
  });
});
