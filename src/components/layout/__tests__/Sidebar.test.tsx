/**
 * Sidebar — nada some porque a janela encolheu.
 *
 * A navbar horizontal media a largura disponível e empurrava o que não coubesse
 * para um dropdown "Mais". Em telas menores, funções inteiras do painel
 * desapareciam atrás de um botão genérico — e quem nunca clicou nele não sabe
 * que a Fidelidade existe.
 *
 * A coluna lateral rola. Não tem overflow, não tem "Mais", não tem descoberta
 * por acidente.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { buildNavSections } from '../navSections';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: false,
});

function renderizar(pathname = '/') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar sections={sections} />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  it('todas as seções aparecem — nenhuma cai em menu "Mais"', () => {
    renderizar();
    const nav = screen.getByRole('navigation', { name: /principal/i });
    for (const s of sections) {
      expect(within(nav).getByText(s.label)).toBeInTheDocument();
    }
    expect(within(nav).queryByText('Mais')).not.toBeInTheDocument();
  });

  it('o grupo da página atual já vem aberto', () => {
    // Chegar numa página e ter que procurar onde ela está no menu é falha de
    // orientação — o menu deve confirmar onde você está, não esconder.
    renderizar('/stores/minha-loja/link-bio');
    expect(screen.getByRole('link', { name: /Link na Bio/ })).toBeInTheDocument();
  });

  it('clicar num grupo abre seus itens e o botão anuncia o estado', () => {
    renderizar();
    const botao = screen.getByRole('button', { name: /Cardápio/ });
    expect(botao).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Combos/ })).toBeInTheDocument();
  });

  it('abrir um grupo fecha o outro — só um caminho aberto por vez', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Cardápio/ }));
    expect(screen.getByRole('link', { name: /Combos/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Configurações/ }));
    expect(screen.queryByRole('link', { name: /Combos/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Entrega/ })).toBeInTheDocument();
  });

  it('o item atual é marcado com aria-current', () => {
    renderizar('/stores/minha-loja/orders');
    expect(screen.getByRole('link', { name: /Pedidos/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('colapsar esconde os rótulos mas mantém os destinos alcançáveis', () => {
    // Modo ícone é para ganhar largura, não para perder navegação: o nome
    // continua no accessible name, senão leitor de tela vê só ícones mudos.
    renderizar('/stores/minha-loja/orders');
    fireEvent.click(screen.getByRole('button', { name: /recolher menu/i }));
    expect(screen.getByRole('link', { name: /Pedidos/ })).toBeInTheDocument();
  });
});
