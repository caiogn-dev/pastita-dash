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

// 13/11, "o botão on e off ainda tá quebrado" (Brinde, aba Preços):
// - ao lado de um rótulo longo numa coluna estreita o trilho ENCOLHIA (44→38 px);
// - a borda só existia desligado, então a bolinha encostava na borda esquerda
//   desligada e tinha outra folga ligada.
it('não encolhe ao lado de rótulo longo', () => {
  render(<Switch checked={false} onChange={jest.fn()} ariaLabel="x" />);
  expect(screen.getByRole('switch').className).toContain('shrink-0');
});

it.each([true, false])('mesma borda e mesma folga ligado e desligado (%s)', (checked) => {
  render(<Switch checked={checked} onChange={jest.fn()} ariaLabel="x" />);
  const sw = screen.getByRole('switch');
  expect(sw.className).toMatch(/(^|\s)border(\s|$)/);
  expect(sw.className).toContain('p-[3px]');
});
