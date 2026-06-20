import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { ProductRow } from '../ProductRow';

const wrap = (ui: React.ReactNode) =>
  <DndContext><SortableContext items={['p1']}>{ui}</SortableContext></DndContext>;

const base = { id: 'p1', name: 'Arroz', price: 6.8, stock_quantity: 47, track_stock: true, featured: false, status: 'active', sku: 'SKU001', is_active: true, created_at: '', updated_at: '' } as any;

describe('ProductRow', () => {
  it('mostra estepper só com track_stock e abre no clique do nome', () => {
    const onOpen = jest.fn();
    render(wrap(<ProductRow product={base} onOpen={onOpen} onStock={jest.fn()} onPrice={jest.fn()} onStatus={jest.fn()} onFeatured={jest.fn()} onMenuAction={jest.fn()} />));
    expect(screen.getByLabelText('aumentar estoque')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Arroz'));
    expect(onOpen).toHaveBeenCalledWith(base);
  });
  it('esconde estepper sem track_stock', () => {
    render(wrap(<ProductRow product={{ ...base, track_stock: false }} onOpen={jest.fn()} onStock={jest.fn()} onPrice={jest.fn()} onStatus={jest.fn()} onFeatured={jest.fn()} onMenuAction={jest.fn()} />));
    expect(screen.queryByLabelText('aumentar estoque')).toBeNull();
  });
});
