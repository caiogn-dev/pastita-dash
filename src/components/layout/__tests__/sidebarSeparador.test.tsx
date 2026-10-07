/**
 * O traço entre blocos tem o mesmo respiro em todo lugar.
 *
 * Medido no Chromium (coluna aberta, 1280px): o primeiro traço tinha 8px em
 * cima e embaixo, os outros três 2px em cima e 0 embaixo. O `my-2` do <li>
 * perdia para o `space-y-0.5` da lista — `.space-y-0.5 > :not([hidden]) ~
 * :not([hidden])` é mais específico que `.my-2` e define as DUAS margens.
 * O traço encostava na seção ativa de baixo.
 *
 * jsdom não aplica o CSS do Tailwind, então o teste garante a estrutura que
 * não depende de margem: o respiro é padding do <li>, o traço é o filho.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { buildNavSections } from '../navSections';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: false,
});

it('separadores usam padding, não margem que o space-y da lista reescreve', () => {
  localStorage.clear();
  render(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar sections={sections} />
    </MemoryRouter>
  );
  const lista = screen.getByRole('navigation', { name: /principal/i }).querySelector('ul')!;
  expect(lista.className).toMatch(/space-y-/);

  const separadores = Array.from(lista.children).filter((li) => li.getAttribute('aria-hidden') === 'true');
  expect(separadores.length).toBeGreaterThan(1);
  for (const li of separadores) {
    expect(li.className).not.toMatch(/(^|\s)m[ytb]?-/);
    expect(li.className).toMatch(/(^|\s)py-/);
    expect(li.firstElementChild?.className).toMatch(/h-px/);
  }
});
