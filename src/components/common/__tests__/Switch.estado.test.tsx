/**
 * Desligado tem que PARECER desligado.
 *
 * O botão do switch era branco nos dois estados: no tema escuro, um switch
 * desligado virava um ponto branco brilhante — o elemento mais claro da linha,
 * chamando atenção justamente para o que está inativo. Numa lista de 75
 * produtos, os pausados saltavam mais que os ativos.
 */
import { render, screen } from '@testing-library/react';

import { Switch } from '../Switch';

it('ligado: trilho da marca e botão branco', () => {
  render(<Switch checked onChange={jest.fn()} ariaLabel="x" />);

  const sw = screen.getByRole('switch');
  expect(sw.className).toContain('bg-brand');
  expect(sw.querySelector('span')?.className).toContain('bg-white');
});

it('desligado: botão apagado, não branco', () => {
  render(<Switch checked={false} onChange={jest.fn()} ariaLabel="x" />);

  const bolinha = screen.getByRole('switch').querySelector('span');
  expect(bolinha?.className).not.toContain('bg-white');
  expect(bolinha?.className).toContain('bg-fg-muted-token');
});
