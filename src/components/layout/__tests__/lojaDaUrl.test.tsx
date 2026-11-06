/**
 * O endereço manda na loja (06/11).
 *
 * Com a Pastita selecionada, /stores/ce-saladas/products e /customers
 * mostravam a Pastita: as telas liam a loja salva no navegador e ignoravam o
 * slug. A correção é UM ponto que sincroniza URL → loja ativa, antes de
 * qualquer tela sob /stores/:storeId renderizar.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { LojaDaUrl, caminhoNaOutraLoja } from '../LojaDaUrl';
import { StoreSelector } from '../StoreSelector';
import { useStore } from '../../../hooks/useStore';
import { useRootStore } from '../../../stores/rootStore';

const LOJAS = [
  { id: 'u-pastita', slug: 'pastita', name: 'Pastita' },
  { id: 'u-ce', slug: 'ce-saladas', name: 'Cê Saladas' },
  { id: 'u-ivoneth', slug: 'ivoneth', name: 'Ivoneth' },
];

const TelaQueLeALojaAtiva = () => {
  const { storeName } = useStore();
  return <p data-testid="tela">tela de {storeName}</p>;
};

const Endereco = () => <p data-testid="endereco">{useLocation().pathname}</p>;

function montar(caminho: string, selecionada: string | null, stores = LOJAS) {
  useRootStore.setState({ stores, selectedStoreId: selecionada } as never);
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <StoreSelector />
      <Endereco />
      <Routes>
        <Route path="/stores/:storeId" element={<LojaDaUrl />}>
          <Route path="products" element={<TelaQueLeALojaAtiva />} />
          <Route path="customers" element={<TelaQueLeALojaAtiva />} />
          <Route path="orders" element={<TelaQueLeALojaAtiva />} />
          <Route path="orders/:id" element={<TelaQueLeALojaAtiva />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('LojaDaUrl — o slug da URL manda na loja ativa', () => {
  beforeEach(() => localStorage.clear());

  it('abrir /stores/ce-saladas/products com a Pastita selecionada mostra a Cê', () => {
    montar('/stores/ce-saladas/products', 'u-pastita');
    expect(screen.getByTestId('tela')).toHaveTextContent('tela de Cê Saladas');
    expect(useRootStore.getState().selectedStoreId).toBe('u-ce');
  });

  it('a tela NUNCA renderiza com a loja errada, nem por um quadro', () => {
    const vistas: string[] = [];
    const Espiã = () => {
      const { storeName } = useStore();
      vistas.push(String(storeName));
      return null;
    };
    useRootStore.setState({ stores: LOJAS, selectedStoreId: 'u-pastita' } as never);
    render(
      <MemoryRouter initialEntries={['/stores/ce-saladas/customers']}>
        <Routes>
          <Route path="/stores/:storeId" element={<LojaDaUrl />}>
            <Route path="customers" element={<Espiã />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(vistas).not.toContain('Pastita');
    expect(vistas).toContain('Cê Saladas');
  });

  it('o seletor lateral acompanha a loja do endereço', () => {
    montar('/stores/ivoneth/orders', 'u-ce');
    expect(screen.getByRole('button', { name: /atual: Ivoneth/ })).toBeInTheDocument();
  });

  it('aceita o uuid no lugar do slug', () => {
    montar('/stores/u-ivoneth/customers', 'u-pastita');
    expect(screen.getByTestId('tela')).toHaveTextContent('tela de Ivoneth');
  });

  it('loja sem acesso: aviso e nada carrega, a loja ativa não muda', () => {
    montar('/stores/agriao/products', 'u-pastita');
    expect(screen.queryByTestId('tela')).not.toBeInTheDocument();
    expect(screen.getByText(/não tem acesso/i)).toBeInTheDocument();
    expect(useRootStore.getState().selectedStoreId).toBe('u-pastita');
  });

  it('lista de lojas ainda não chegou: espera, não mostra tela nem aviso', () => {
    montar('/stores/ce-saladas/products', 'u-pastita', []);
    expect(screen.queryByTestId('tela')).not.toBeInTheDocument();
    expect(screen.queryByText(/não tem acesso/i)).not.toBeInTheDocument();
  });

  it('trocar no seletor dentro de /stores/<slug> leva o endereço junto (e não volta)', () => {
    montar('/stores/pastita/customers', 'u-pastita');
    fireEvent.click(screen.getByRole('button', { name: /atual: Pastita/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cê Saladas/ }));
    expect(screen.getByTestId('endereco')).toHaveTextContent('/stores/ce-saladas/customers');
    expect(screen.getByTestId('tela')).toHaveTextContent('tela de Cê Saladas');
    expect(useRootStore.getState().selectedStoreId).toBe('u-ce');
  });

  it('a loja salva mudando por fora NÃO reescreve o endereço', () => {
    // "Um endereço da Pastita trocou sozinho para a Ivoneth": a loja salva
    // nunca pode empurrar a URL. Só o gesto de trocar de loja navega.
    montar('/stores/pastita/products', 'u-pastita');
    act(() => {
      useRootStore.getState().setSelectedStore('u-ivoneth');
    });
    expect(screen.getByTestId('endereco')).toHaveTextContent('/stores/pastita/products');
    expect(screen.getByTestId('tela')).toHaveTextContent('tela de Pastita');
  });
});

describe('caminhoNaOutraLoja', () => {
  it.each([
    ['/stores/pastita/products', 'ce-saladas', '/stores/ce-saladas/products'],
    ['/stores/pastita/orders/historico', 'ce-saladas', '/stores/ce-saladas/orders/historico'],
    // id de pedido/combo é da loja antiga: volta para a lista da seção
    ['/stores/pastita/orders/9b1c-uuid', 'ce-saladas', '/stores/ce-saladas/orders'],
    ['/stores/pastita/combos/12/edit', 'ce-saladas', '/stores/ce-saladas/combos'],
    ['/stores/pastita', 'ce-saladas', '/stores/ce-saladas'],
    ['/stores/pastita/kds', 'ce-saladas', '/stores/ce-saladas/kds'],
  ])('%s → %s', (de, slug, para) => {
    expect(caminhoNaOutraLoja(de, slug)).toBe(para);
  });

  it('fora de /stores/<slug> não navega', () => {
    expect(caminhoNaOutraLoja('/analytics/vendas', 'ce-saladas')).toBeNull();
    expect(caminhoNaOutraLoja('/stores', 'ce-saladas')).toBeNull();
  });
});
