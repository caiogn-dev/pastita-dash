/**
 * Filtro e ação são coisas diferentes, e a tela do cardápio as misturava.
 *
 * Buscar, filtrar por categoria, ordenar categorias e adicionar categoria
 * ficavam na mesma barra, com o mesmo peso visual — quatro controles de dois
 * tipos. Filtro muda o que você VÊ; ação muda o que EXISTE. Misturados, o dono
 * clica em "adicionar categoria" procurando um filtro.
 *
 * O chassi da página tem lugar para cada um (`filtros` e `acoes`), e é ele que
 * garante a mesma posição em todas as telas do painel. Este arquivo testa os
 * dois pedaços separados, como eles agora existem.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AcoesDoCardapio, ProductsToolbar } from '../ProductsToolbar';

describe('filtros do cardápio', () => {
  it('busca por nome', () => {
    const onSearch = jest.fn();
    render(
      <ProductsToolbar
        search=""
        onSearch={onSearch}
        categoryFilter=""
        categories={[]}
        onCategoryFilter={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/buscar/i), {
      target: { value: 'arroz' },
    });

    expect(onSearch).toHaveBeenCalledWith('arroz');
  });

  it('filtra por categoria', () => {
    const onCategoryFilter = jest.fn();
    render(
      <ProductsToolbar
        search=""
        onSearch={jest.fn()}
        categoryFilter=""
        categories={[{ id: 'c1', name: 'Saladas' } as never]}
        onCategoryFilter={onCategoryFilter}
      />,
    );

    fireEvent.change(screen.getByDisplayValue(/todas as categorias/i), {
      target: { value: 'c1' },
    });

    expect(onCategoryFilter).toHaveBeenCalledWith('c1');
  });

  it('não carrega mais botão de ação nenhum', () => {
    // A regressão que este teste impede: alguém devolver "adicionar categoria"
    // para a barra de filtros por parecer perto.
    render(
      <ProductsToolbar
        search=""
        onSearch={jest.fn()}
        categoryFilter=""
        categories={[]}
        onCategoryFilter={jest.fn()}
      />,
    );

    expect(screen.queryByText(/adicionar categoria/i)).toBeNull();
    expect(screen.queryByText(/ordenar categorias/i)).toBeNull();
  });
});

describe('ações do cardápio', () => {
  it('ordena categorias', () => {
    const onReorderCategories = jest.fn();
    render(
      <AcoesDoCardapio
        reorderMode={false}
        onReorderCategories={onReorderCategories}
        onAddCategory={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/ordenar categorias/i));

    expect(onReorderCategories).toHaveBeenCalled();
  });

  it('adiciona categoria', () => {
    const onAddCategory = jest.fn();
    render(
      <AcoesDoCardapio
        reorderMode={false}
        onReorderCategories={jest.fn()}
        onAddCategory={onAddCategory}
      />,
    );

    fireEvent.click(screen.getByText(/adicionar categoria/i));

    expect(onAddCategory).toHaveBeenCalled();
  });

  it('em modo de ordenação, o botão diz como SAIR dele', () => {
    // "Ordenar categorias" ligado e continuar dizendo "Ordenar categorias"
    // deixa o dono sem saber como voltar ao normal.
    render(
      <AcoesDoCardapio
        reorderMode
        onReorderCategories={jest.fn()}
        onAddCategory={jest.fn()}
      />,
    );

    expect(screen.getByText(/concluir ordenação/i)).toBeInTheDocument();
  });
});
