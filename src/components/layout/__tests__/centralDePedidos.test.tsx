/**
 * A Central de Pedidos abre em aba própria.
 *
 * É a tela que fica aberta o expediente inteiro: o operador acompanha os
 * pedidos nela enquanto usa o resto do painel para cadastrar produto,
 * responder cliente, conferir caixa. Navegar para dentro dela pelo menu
 * significa perder o lugar toda vez — e voltar pelo botão do navegador.
 *
 * DUAS REGRAS:
 *
 * 1. O contrato é VISÍVEL. Link que rouba para outra aba sem avisar é um dos
 *    incômodos clássicos de web; com o ícone de "abre fora" e o texto para
 *    leitor de tela, vira escolha.
 *
 * 2. A aba é NOMEADA. Clicar cinco vezes durante o turno reaproveita a mesma
 *    aba em vez de empilhar cinco cópias da mesma tela.
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

function renderizar(pathname = '/stores/minha-loja/orders') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar sections={sections} />
    </MemoryRouter>
  );
}

describe('Central de Pedidos', () => {
  it('aparece no menu com o destino do painel de pedidos', () => {
    renderizar();
    const link = screen.getByRole('link', { name: /Central de Pedidos/ });
    expect(link).toHaveAttribute('href', '/stores/minha-loja/orders');
  });

  it('abre em aba nomeada — clicar de novo reaproveita, não empilha', () => {
    renderizar();
    const link = screen.getByRole('link', { name: /Central de Pedidos/ });
    expect(link).toHaveAttribute('target', 'central-de-pedidos');
    // `noopener`: sem isso a aba nova recebe `window.opener` e pode manipular
    // a aba de origem.
    expect(link.getAttribute('rel')).toMatch(/noopener/);
  });

  it('avisa que abre fora — para quem vê e para quem ouve', () => {
    renderizar();
    const link = screen.getByRole('link', { name: /Central de Pedidos/ });
    expect(link).toHaveAccessibleName(/nova aba/i);
  });
});
