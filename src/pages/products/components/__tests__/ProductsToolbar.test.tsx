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
});
