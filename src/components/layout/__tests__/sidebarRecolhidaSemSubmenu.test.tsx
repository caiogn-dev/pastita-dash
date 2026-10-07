/**
 * Recolhida, a coluna é uma fileira de SEÇÕES — sem submenu de ícones mudos.
 *
 * Recolher já fechava o grupo aberto ("o submenu desenhado por cima de uma
 * coluna de 72px é pior que antes de recolher"). Mas o efeito que abre o
 * grupo da rota roda a cada navegação e a cada recarga, então quem deixou a
 * coluna recolhida via, em TODA página, os filhos do grupo atual empilhados
 * sob o ícone da seção: ícones menores, alinhados à esquerda, sem rótulo e
 * indistinguíveis das seções. O mesmo acontecia ao tirar o mouse depois de
 * abrir um grupo na espiada.
 *
 * O lugar onde a página mora continua marcado pela própria seção (fundo e
 * barra de ativo). Os filhos voltam quando a coluna abre (hover/foco).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { buildNavSections } from '../navSections';
import { CHAVE_COLUNA } from '../preferenciaDaColuna';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: false,
});

const renderizar = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar sections={sections} />
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(CHAVE_COLUNA, 'recolhida');
});

it('recolhida numa página de grupo, os filhos não ficam empilhados na coluna', () => {
  renderizar('/stores/minha-loja/coupons');
  expect(screen.queryByRole('link', { name: /Cupons/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Cardápio/ })).toHaveAttribute('aria-expanded', 'false');
});

it('a seção da página continua marcada como ativa', () => {
  renderizar('/stores/minha-loja/coupons');
  expect(screen.getByRole('button', { name: /Cardápio/ }).className).toMatch(/bg-brand-soft/);
});

it('ao espiar, o grupo da página já aparece aberto e com o item marcado', () => {
  renderizar('/stores/minha-loja/coupons');
  fireEvent.mouseEnter(screen.getByRole('navigation', { name: /principal/i }));
  expect(screen.getByRole('link', { name: /Cupons/ })).toHaveAttribute('aria-current', 'page');
});

it('abrir um grupo na espiada e tirar o mouse não deixa o submenu para trás', () => {
  renderizar('/');
  const nav = screen.getByRole('navigation', { name: /principal/i });
  fireEvent.mouseEnter(nav);
  fireEvent.click(screen.getByRole('button', { name: /Relatórios/ }));
  expect(screen.getByRole('link', { name: /Visão geral/ })).toBeInTheDocument();

  fireEvent.mouseLeave(nav);
  expect(screen.queryByRole('link', { name: /Visão geral/ })).not.toBeInTheDocument();
});
