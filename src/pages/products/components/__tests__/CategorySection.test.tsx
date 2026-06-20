import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { CategorySection } from '../CategorySection';

const group = {
  id: 'a',
  name: 'Almoço',
  is_active: true,
  sort_order: 1,
  products: [
    {
      id: 'p1',
      name: 'Arroz',
      price: 6.8,
      stock_quantity: 1,
      track_stock: false,
      status: 'active',
    } as any,
  ],
};
const handlers = {
  onOpen: jest.fn(),
  onStock: jest.fn(),
  onPrice: jest.fn(),
  onStatus: jest.fn(),
  onFeatured: jest.fn(),
  onMenuAction: jest.fn(),
};

describe('CategorySection', () => {
  it('mostra nome e produtos; colapsado esconde produtos', () => {
    const { rerender } = render(
      <DndContext>
        <CategorySection
          group={group}
          collapsed={false}
          rowHandlers={handlers}
          onToggleCollapse={jest.fn()}
          onTogglePause={jest.fn()}
          onAddItem={jest.fn()}
        />
      </DndContext>
    );
    expect(screen.getByText('Almoço')).toBeInTheDocument();
    expect(screen.getByText('Arroz')).toBeInTheDocument();
    rerender(
      <DndContext>
        <CategorySection
          group={group}
          collapsed
          rowHandlers={handlers}
          onToggleCollapse={jest.fn()}
          onTogglePause={jest.fn()}
          onAddItem={jest.fn()}
        />
      </DndContext>
    );
    expect(screen.queryByText('Arroz')).toBeNull();
  });
  it('"adicionar item" dispara callback com id da categoria', () => {
    const onAddItem = jest.fn();
    render(
      <DndContext>
        <CategorySection
          group={group}
          collapsed={false}
          rowHandlers={handlers}
          onToggleCollapse={jest.fn()}
          onTogglePause={jest.fn()}
          onAddItem={onAddItem}
        />
      </DndContext>
    );
    fireEvent.click(screen.getByText(/adicionar novo item/i));
    expect(onAddItem).toHaveBeenCalledWith('a');
  });
});
