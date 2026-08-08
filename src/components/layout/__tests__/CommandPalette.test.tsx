/**
 * Ctrl+K — chegar em qualquer tela sem navegar até ela.
 *
 * Hoje ir de "Pedidos" para "Fidelidade" custa: achar a seção certa no menu,
 * abrir, ler os itens, clicar. Três decisões e quatro movimentos do mouse para
 * uma coisa que a pessoa já sabia que queria antes de começar. Quem usa o
 * painel o dia inteiro faz isso dezenas de vezes.
 *
 * A paleta inverte: você DIGITA o destino. Não precisa saber em que seção ele
 * mora — e é justamente esse conhecimento que o operador não tem, porque a
 * taxonomia é nossa, não dele.
 *
 * A lista sai de `buildNavSections`: a mesma árvore do menu lateral e da
 * trilha. Uma página nova aparece na paleta sem ninguém lembrar de cadastrá-la.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { CommandPalette } from '../CommandPalette';
import { buildNavSections } from '../navSections';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: false,
});

const navegar = jest.fn();

function renderizar(aberto = true) {
  return render(
    <MemoryRouter>
      <CommandPalette
        aberto={aberto}
        onFechar={jest.fn()}
        sections={sections}
        onNavegar={navegar}
      />
    </MemoryRouter>
  );
}

beforeEach(() => navegar.mockClear());

describe('CommandPalette', () => {
  it('fechada não renderiza nada', () => {
    renderizar(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lista todos os destinos do painel', () => {
    renderizar();
    expect(screen.getByRole('option', { name: /Link na Bio/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Combos/ })).toBeInTheDocument();
  });

  it('cada destino mostra a seção onde mora — a paleta ENSINA o menu', () => {
    // Quem usa a paleta descobre onde a tela fica, em vez de aprender a evitar
    // o menu. Os dois caminhos se reforçam.
    renderizar();
    expect(screen.getByRole('option', { name: /Cardápio.*Link na Bio|Link na Bio.*Cardápio/ })).toBeInTheDocument();
  });

  it('busca ignora acento e caixa', () => {
    // Ninguém digita "Relatórios" com acento no meio da correria.
    //
    // `getAllBy`: "Relatórios" é seção com filhos, e a paleta mostra a seção ao
    // lado de CADA item — é o que faz ela ensinar o menu em vez de substituí-lo.
    renderizar();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'relatorios' } });
    const achados = screen.getAllByRole('option', { name: /Relatórios/ });
    expect(achados.length).toBeGreaterThan(0);
    expect(achados.some((o) => /Metas e Conquistas/.test(o.textContent ?? ''))).toBe(true);
  });

  it('setas movem a seleção e Enter navega para ela', () => {
    renderizar();
    const campo = screen.getByRole('combobox');
    fireEvent.change(campo, { target: { value: 'combo' } });

    const opcao = screen.getByRole('option', { name: /Combos/ });
    expect(opcao).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(navegar).toHaveBeenCalledWith('/stores/minha-loja/combos');
  });

  it('a seleção circula em vez de travar na ponta', () => {
    // Travar no último item obriga a voltar item a item. Circular é o que todo
    // seletor de teclado faz — quebrar essa expectativa custa mais que ganha.
    renderizar();
    const campo = screen.getByRole('combobox');
    const total = screen.getAllByRole('option').length;
    expect(total).toBeGreaterThan(1);

    // Uma volta completa + 1 passo: deve parar no SEGUNDO item.
    for (let i = 0; i < total + 1; i += 1) {
      fireEvent.keyDown(campo, { key: 'ArrowDown' });
    }
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    // E para cima a partir do primeiro vai para o último, não trava no zero.
    fireEvent.keyDown(campo, { key: 'ArrowUp' });
    fireEvent.keyDown(campo, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[total - 1]).toHaveAttribute('aria-selected', 'true');
  });

  it('busca sem resultado explica, não some', () => {
    renderizar();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzzz' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText(/nada encontrado/i)).toBeInTheDocument();
  });
});
