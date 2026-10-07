/**
 * O item da página atual não pode nascer abaixo da dobra da coluna.
 *
 * Medido no Chromium a 1280×720: em /colaboradores o grupo Configurações
 * abria sozinho, mas o item ativo ficava em y=727 com a lista terminando em
 * 665 (scrollTop 0). Em notebook o operador via o grupo aberto e não via onde
 * estava.
 *
 * jsdom não faz layout: as caixas são simuladas — a lista com 300px de
 * altura e o item ativo em 500–530.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { buildNavSections } from '../navSections';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: false,
});

const caixa = (top: number, bottom: number) =>
  ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

let original: typeof Element.prototype.getBoundingClientRect;
beforeEach(() => {
  localStorage.clear();
  original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this.tagName === 'UL' && this.parentElement?.tagName === 'NAV') return caixa(0, 300);
    if (this.getAttribute('aria-current') === 'page') return caixa(500, 530);
    return caixa(0, 0);
  };
});
afterEach(() => {
  Element.prototype.getBoundingClientRect = original;
});

const lista = () => screen.getByRole('navigation', { name: /principal/i }).querySelector('ul')!;

it('rola a lista até o item ativo quando ele nasce abaixo da dobra', () => {
  render(
    <MemoryRouter initialEntries={['/colaboradores']}>
      <Sidebar sections={sections} />
    </MemoryRouter>
  );
  expect(screen.getByRole('link', { name: /Colaboradores/ })).toHaveAttribute('aria-current', 'page');
  expect(lista().scrollTop).toBeGreaterThanOrEqual(230);
});

it('abrir outro grupo não puxa a lista de volta para o item ativo', () => {
  render(
    <MemoryRouter initialEntries={['/stores/minha-loja/customers']}>
      <Sidebar sections={sections} />
    </MemoryRouter>
  );
  lista().scrollTop = 0;
  fireEvent.click(screen.getByRole('button', { name: /Pedidos/ }));
  expect(lista().scrollTop).toBe(0);
});
