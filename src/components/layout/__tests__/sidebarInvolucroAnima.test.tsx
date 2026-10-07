/**
 * Recolher e fixar: o espaço reservado anda junto com a coluna.
 *
 * O invólucro trocava de 256 para 72px num quadro só, enquanto a coluna
 * levava ~240ms encolhendo. Medido no Chromium, quadro a quadro:
 *
 *   - Recolher: a navbar e a página iam para x=72 no primeiro quadro; com a
 *     coluna ainda em 212px, o ponto (150,30) era da NAVBAR — ela pintava por
 *     cima da coluna que encolhia.
 *   - Fixar aberto (vindo da espiada): o "Central de Pedidos" pulava de 303
 *     para 487px e deslizava de volta — a barra inteira dava um tranco.
 *
 * Com o invólucro animando na mesma duração e curva da coluna, as duas
 * larguras coincidem em todo quadro.
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

it('invólucro e coluna animam a largura na mesma duração e curva', () => {
  localStorage.clear();
  render(
    <MemoryRouter>
      <Sidebar sections={sections} />
    </MemoryRouter>
  );
  const nav = screen.getByRole('navigation', { name: /principal/i });
  const involucro = nav.parentElement as HTMLElement;

  for (const el of [nav, involucro]) {
    expect(el.className).toMatch(/transition-\[width\]/);
    expect(el.className).toMatch(/duration-300/);
  }
  expect(involucro.style.transitionTimingFunction).toBe(nav.style.transitionTimingFunction);
  expect(nav.style.transitionTimingFunction).toBe('var(--desliza)');
});

it('a coluna fica numa camada acima da navbar mesmo fora da espiada', () => {
  // No quadro em que a espiada termina a coluna ainda está larga; sem camada,
  // a navbar (sticky z-40) pintava por cima do topo dela durante a animação.
  localStorage.clear();
  render(
    <MemoryRouter>
      <Sidebar sections={sections} />
    </MemoryRouter>
  );
  const nav = screen.getByRole('navigation', { name: /principal/i });
  expect(nav.className).toMatch(/\brelative\b/);
  expect(nav.className).toMatch(/\bz-50\b/);
});
