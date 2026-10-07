/**
 * O grupo que o operador abriu não pode fechar sozinho.
 *
 * `useNavSections` devolve um array NOVO sempre que o contador de não lidas
 * muda (o selo de Atendimento faz parte da árvore). O efeito que abre o grupo
 * da rota atual dependia de `sections`, então cada mensagem de WhatsApp que
 * chegava rodava o efeito de novo e trocava o grupo aberto pelo da página —
 * o operador abria "Relatórios" para escolher um, e o menu pulava de volta
 * para "Cardápio" no meio da leitura.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { buildNavSections } from '../navSections';

const montar = (unreadBadge?: string) =>
  buildNavSections({
    storeHref: (p) => `/stores/minha-loja/${p}`,
    automationEnabled: false,
    unreadBadge,
  });

beforeEach(() => localStorage.clear());

it('nova mensagem (árvore recalculada) não troca o grupo que o operador abriu', () => {
  const { rerender } = render(
    <MemoryRouter initialEntries={['/stores/minha-loja/coupons']}>
      <Sidebar sections={montar()} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: /Relatórios/ }));
  expect(screen.getByRole('link', { name: /Visão geral/ })).toBeInTheDocument();

  rerender(
    <MemoryRouter initialEntries={['/stores/minha-loja/coupons']}>
      <Sidebar sections={montar('3')} />
    </MemoryRouter>
  );

  expect(screen.getByRole('link', { name: /Visão geral/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Relatórios/ })).toHaveAttribute('aria-expanded', 'true');
});

it('quando a loja carrega e o grupo da página passa a existir, ele abre', () => {
  // Sem loja, `storeHref` cai em `/stores` e nenhum grupo casa com a rota.
  // Quando a loja chega, o grupo dono da página tem que abrir — o efeito
  // continua reagindo à árvore, só não ao que não muda o dono.
  const semLoja = buildNavSections({ storeHref: () => '/stores', automationEnabled: false });
  const { rerender } = render(
    <MemoryRouter initialEntries={['/stores/minha-loja/coupons']}>
      <Sidebar sections={semLoja} />
    </MemoryRouter>
  );
  expect(screen.queryByRole('link', { name: /Cupons/ })).not.toBeInTheDocument();

  rerender(
    <MemoryRouter initialEntries={['/stores/minha-loja/coupons']}>
      <Sidebar sections={montar()} />
    </MemoryRouter>
  );
  expect(screen.getByRole('link', { name: /Cupons/ })).toHaveAttribute('aria-current', 'page');
});
