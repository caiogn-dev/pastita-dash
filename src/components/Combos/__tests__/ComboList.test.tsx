import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ComboList } from '../ComboList';
import type { StoreCombo } from '../../../services/storesApi';

const combo = (id: string, nome: string, extra: Partial<StoreCombo> = {}) =>
  ({
    id, store: 's1', name: nome, slug: id, description: '', price: 30, is_active: true, featured: false,
    track_stock: false, stock_quantity: 0, savings: 0, savings_percentage: 0, created_at: '', updated_at: '',
    groups: [], ...extra,
  }) as StoreCombo;

const COMBOS = [
  combo('c1', 'Combo Básico'),
  combo('c2', 'Família', {
    dynamic_pricing: true, price: 0,
    groups: [{
      id: 'g', product_id: null, product_name: '', is_required: true, min_selections: 3, max_selections: 3,
      allow_duplicate_variants: true, position: 0, variant_limits: [],
      product_options: [
        { product_id: 'p1', name: 'A', price: 1, max_selections: 3 },
        { product_id: 'p2', name: 'B', price: 1, max_selections: 3 },
      ],
    }],
  }),
  combo('c3', 'Antigo', { is_active: false }),
];

const abrir = () => {
  const acoes = {
    onEdit: jest.fn(), onDelete: jest.fn(), onToggleActive: jest.fn(),
    onToggleFeatured: jest.fn(), onDuplicate: jest.fn(),
  };
  render(<ComboList combos={COMBOS} {...acoes} />);
  return acoes;
};

describe('ComboList', () => {
  it('mostra cada combo com preço e o resumo do que o cliente escolhe', () => {
    abrir();
    expect(screen.getByText('Combo Básico')).toBeInTheDocument();
    expect(screen.getByText('1 escolha · 2 opções')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 30,00').length).toBeGreaterThan(0);
  });

  it('busca e filtra por estar no cardápio', () => {
    abrir();
    fireEvent.change(screen.getByPlaceholderText('Buscar combos'), { target: { value: 'famí' } });
    expect(screen.queryByText('Combo Básico')).not.toBeInTheDocument();
    expect(screen.getByText('Família')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar combos'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('tab', { name: /fora/i }));
    expect(screen.getByText('Antigo')).toBeInTheDocument();
    expect(screen.queryByText('Família')).not.toBeInTheDocument();
  });

  it('tocar no cartão edita; interruptor, estrela e menu agem sem abrir o combo', () => {
    const acoes = abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Combo Básico' }));
    expect(acoes.onEdit).toHaveBeenCalledWith(COMBOS[0]);
    fireEvent.click(screen.getByRole('switch', { name: 'Combo Básico no cardápio' }));
    expect(acoes.onToggleActive).toHaveBeenCalledWith(COMBOS[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Destacar Combo Básico' }));
    expect(acoes.onToggleFeatured).toHaveBeenCalledWith(COMBOS[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Mais ações de Família' }));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /duplicar/i }));
    expect(acoes.onDuplicate).toHaveBeenCalledWith(COMBOS[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Mais ações de Antigo' }));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /excluir/i }));
    expect(acoes.onDelete).toHaveBeenCalledWith(COMBOS[2]);
    expect(acoes.onEdit).toHaveBeenCalledTimes(1);
  });

  it('vazio diz que não há combo', () => {
    render(
      <ComboList combos={[]} onEdit={jest.fn()} onDelete={jest.fn()} onToggleActive={jest.fn()} onToggleFeatured={jest.fn()} />,
    );
    expect(screen.getByText('Nenhum combo ainda')).toBeInTheDocument();
  });
});
