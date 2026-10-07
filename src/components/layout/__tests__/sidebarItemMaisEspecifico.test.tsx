/**
 * Uma página, um item marcado.
 *
 * `ativo()` casa por prefixo para cobrir sub-rotas (`/orders/123`). Só que
 * Marketing tem dois destinos em que um é prefixo do outro:
 * "Campanha WhatsApp" (/marketing/whatsapp) e "Modelos de mensagem"
 * (/marketing/whatsapp/templates). Na tela de modelos os DOIS ficavam com o
 * fundo de ativo e `aria-current="page"` — o menu dizia que o operador estava
 * em dois lugares. A trilha (`trilhaDoCaminho`) já escolhia o casamento mais
 * longo; a coluna não.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { buildNavSections } from '../navSections';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: true,
});

const renderizar = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar sections={sections} />
    </MemoryRouter>
  );

beforeEach(() => localStorage.clear());

it('em Modelos de mensagem, só Modelos fica marcado', () => {
  renderizar('/marketing/whatsapp/templates');
  expect(screen.getByRole('link', { name: /Modelos de mensagem/ })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: /Campanha WhatsApp/ })).not.toHaveAttribute('aria-current');
});

it('em Campanha WhatsApp (e sub-rota dela), só a Campanha fica marcada', () => {
  renderizar('/marketing/whatsapp/nova');
  expect(screen.getByRole('link', { name: /Campanha WhatsApp/ })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: /Modelos de mensagem/ })).not.toHaveAttribute('aria-current');
});

it('no máximo um aria-current na coluna inteira', () => {
  renderizar('/marketing/whatsapp/templates/123');
  const nav = screen.getByRole('navigation', { name: /principal/i });
  expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
});
