/**
 * A marca não pode aparecer PICOTADA enquanto a coluna abre.
 *
 * O dono passou o mouse na coluna recolhida e leu "CA" no lugar de
 * "CARDAPIDEX". Não era fonte nem imagem: a largura anima em 300ms, mas os
 * rótulos entram no DOM no primeiro frame — texto de 129px espremido num
 * container de 7px, e o `truncate` corta. Todo passar de mouse mostrava a
 * marca (e todos os itens do menu) cortados até a animação terminar.
 *
 * A régua: o texto só entra quando a coluna JÁ tem a largura final. Ao
 * recolher é o contrário — some na hora, antes de a largura encolher, pelo
 * mesmo motivo.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { buildNavSections } from '../navSections';
import { useRootStore } from '../../../stores/rootStore';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: false,
});

const renderizar = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Sidebar sections={sections} />
  </MemoryRouter>,
);

const aColuna = () => screen.getByRole('navigation', { name: /principal/i });
const oInvolucro = () => aColuna().parentElement as HTMLElement;
const aMarca = () => screen.queryByText('Cardapidex');

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  useRootStore.setState({ stores: [{ id: '1', name: 'Cê Saladas' }], selectedStoreId: '1' } as never);
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

/** Deixa a coluna recolhida e com o ponteiro FORA dela. */
function recolher() {
  fireEvent.mouseEnter(oInvolucro());
  fireEvent.click(screen.getByRole('button', { name: /recolher menu/i }));
  fireEvent.mouseLeave(oInvolucro());
}

it('coluna aberta mostra a marca desde o primeiro frame', () => {
  renderizar();
  expect(aMarca()).toBeInTheDocument();
});

it('recolhida, a marca não aparece', () => {
  renderizar();
  recolher();
  expect(aMarca()).not.toBeInTheDocument();
});

it('na espiada o texto espera a largura chegar — nada de "CA"', () => {
  renderizar();
  recolher();

  fireEvent.mouseEnter(oInvolucro());
  // A largura já foi pedida...
  expect(aColuna().className).toMatch(/w-64/);
  // ...mas o texto ainda não, porque a animação está no meio.
  expect(aMarca()).not.toBeInTheDocument();

  act(() => { jest.advanceTimersByTime(400); });
  expect(aMarca()).toBeInTheDocument();
});

it('ao sair, o texto some antes de a coluna encolher', () => {
  renderizar();
  recolher();
  fireEvent.mouseEnter(oInvolucro());
  act(() => { jest.advanceTimersByTime(400); });
  expect(aMarca()).toBeInTheDocument();

  fireEvent.mouseLeave(oInvolucro());
  // Sem esperar timer nenhum: sumir é imediato.
  expect(aMarca()).not.toBeInTheDocument();
});
