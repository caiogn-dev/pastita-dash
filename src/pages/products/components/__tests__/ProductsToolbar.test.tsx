import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductsToolbar } from '../ProductsToolbar';

describe('ProductsToolbar', () => {
  it('dispara busca e botões', () => {
    const onSearch = jest.fn();
    const onAddCategory = jest.fn();
    const onReorderCategories = jest.fn();
    render(
      <ProductsToolbar
        search=""
        onSearch={onSearch}
        categoryFilter=""
        categories={[]}
        onCategoryFilter={jest.fn()}
        onReorderCategories={onReorderCategories}
        onAddCategory={onAddCategory}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), {
      target: { value: 'arroz' },
    });
    expect(onSearch).toHaveBeenCalledWith('arroz');
    fireEvent.click(screen.getByText(/ordenar categorias/i));
    expect(onReorderCategories).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/adicionar categoria/i));
    expect(onAddCategory).toHaveBeenCalled();
  });

  it('busca e filtro de categoria têm nome acessível (WCAG 4.1.2)', () => {
    render(
      <ProductsToolbar
        search=""
        onSearch={jest.fn()}
        categoryFilter=""
        categories={[{ id: '1', name: 'Bebidas' } as never]}
        onCategoryFilter={jest.fn()}
        onReorderCategories={jest.fn()}
        onAddCategory={jest.fn()}
      />
    );
    // placeholder não é nome acessível: o campo precisa de aria-label
    expect(screen.getByRole('textbox', { name: /buscar produto/i })).toBeInTheDocument();
    // o <select> de categoria precisa dizer O QUE filtra
    expect(
      screen.getByRole('combobox', { name: /filtrar por categoria/i })
    ).toBeInTheDocument();
  });

  it('filtro de categoria dispara onCategoryFilter', () => {
    const onCategoryFilter = jest.fn();
    render(
      <ProductsToolbar
        search=""
        onSearch={jest.fn()}
        categoryFilter=""
        categories={[{ id: '7', name: 'Bebidas' } as never]}
        onCategoryFilter={onCategoryFilter}
        onReorderCategories={jest.fn()}
        onAddCategory={jest.fn()}
      />
    );
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por categoria/i }), {
      target: { value: '7' },
    });
    expect(onCategoryFilter).toHaveBeenCalledWith('7');
  });
});
