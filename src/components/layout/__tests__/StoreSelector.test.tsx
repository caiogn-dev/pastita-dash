/**
 * Seletor de loja: identidade primeiro, controle só quando há escolha.
 *
 * Era um `<select>` nativo, com a aparência do sistema operacional em vez da
 * do painel, e aparecia SEMPRE — inclusive para quem tem uma loja só, que é a
 * maioria. Um seletor que só pode selecionar uma coisa não é seletor: é ruído
 * que ocupa o lugar mais nobre da tela e ensina o operador a ignorar aquela
 * região.
 *
 * Com uma loja, o nome vira identidade (você lê e sabe onde está). Com duas ou
 * mais, vira botão de verdade, com busca quando a lista cresce.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StoreSelector } from '../StoreSelector';
import { useRootStore } from '../../../stores/rootStore';

type Loja = { id: string; name: string; slug?: string; logo_url?: string | null };

function montar(stores: Loja[], selectedStoreId: string | null = stores[0]?.id ?? null) {
  useRootStore.setState({ stores, selectedStoreId } as never);
  return render(<StoreSelector />);
}

const UMA = [{ id: '1', name: 'Cê Saladas' }];
const DUAS = [
  { id: '1', name: 'Cê Saladas' },
  { id: '2', name: 'Pastita' },
];

describe('StoreSelector', () => {
  it('sem loja nenhuma não renderiza nada', () => {
    const { container } = montar([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('com UMA loja mostra o nome, não um controle', () => {
    // O dono de loja única nunca vai trocar de loja. Oferecer o gesto é
    // prometer uma escolha que não existe.
    montar(UMA);
    expect(screen.getByText('Cê Saladas')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('com duas lojas vira botão que abre a lista', () => {
    montar(DUAS);
    const botao = screen.getByRole('button', { name: /Cê Saladas/ });
    expect(botao).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: /Pastita/ })).toBeInTheDocument();
  });

  it('escolher uma loja troca a seleção e fecha', () => {
    montar(DUAS);
    fireEvent.click(screen.getByRole('button', { name: /Cê Saladas/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Pastita/ }));

    expect(useRootStore.getState().selectedStoreId).toBe('2');
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('a loja atual é marcada, não some da lista', () => {
    // Sumir da lista quebra a posição dos itens a cada troca: você aprende
    // "Pastita é a segunda" e na próxima vez ela é a primeira.
    montar(DUAS);
    fireEvent.click(screen.getByRole('button', { name: /Cê Saladas/ }));
    expect(screen.getByRole('menuitem', { name: /Cê Saladas/ })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('lista curta não ganha busca — o olho varre mais rápido que a mão digita', () => {
    montar(DUAS);
    fireEvent.click(screen.getByRole('button', { name: /Cê Saladas/ }));
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('lista longa ganha busca', () => {
    const muitas = Array.from({ length: 9 }, (_, i) => ({ id: String(i), name: `Loja ${i}` }));
    montar(muitas, '0');
    fireEvent.click(screen.getByRole('button', { name: /Loja 0/ }));
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('a busca filtra e avisa quando não sobra nada', () => {
    const muitas = Array.from({ length: 9 }, (_, i) => ({ id: String(i), name: `Loja ${i}` }));
    montar(muitas, '0');
    fireEvent.click(screen.getByRole('button', { name: /Loja 0/ }));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Loja 7' } });
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);

    // Lista vazia sem explicação parece defeito do painel.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    expect(screen.getByText(/Nenhuma loja/i)).toBeInTheDocument();
  });

  it('Esc fecha sem trocar de loja', () => {
    montar(DUAS);
    fireEvent.click(screen.getByRole('button', { name: /Cê Saladas/ }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    expect(useRootStore.getState().selectedStoreId).toBe('1');
  });
});
