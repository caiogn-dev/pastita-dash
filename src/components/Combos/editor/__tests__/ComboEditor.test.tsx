import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { ComboEditor } from '../ComboEditor';
import type { StoreCombo, StoreProduct } from '../../../../services/storesApi';

const produto = (id: string, nome: string, preco: number, categoria: string) =>
  ({ id, name: nome, price: preco, variants: [], category_name: categoria }) as unknown as StoreProduct;

const PRODUTOS = [
  produto('p1', 'Frango grelhado', 30, 'Pratos'),
  produto('p2', 'Carne de panela', 35, 'Pratos'),
  produto('p3', 'Suco', 8, 'Bebidas'),
];

const abrir = (props: Partial<React.ComponentProps<typeof ComboEditor>> = {}) => {
  const onSalvar = jest.fn().mockResolvedValue(undefined);
  render(
    <ComboEditor storeId="s1" produtos={PRODUTOS} onSalvar={onSalvar} onCancelar={jest.fn()} {...props} />,
  );
  return { onSalvar };
};

const preencherPreco = (valor: string) => {
  const campo = screen.getByTestId('combo-preco');
  fireEvent.change(campo, { target: { value: valor } });
  fireEvent.blur(campo);
};

describe('ComboEditor', () => {
  it('cria um combo com uma escolha de produtos em poucos toques', async () => {
    const { onSalvar } = abrir();
    fireEvent.change(screen.getByLabelText('Nome do combo'), { target: { value: 'Casal' } });
    preencherPreco('59.9');

    fireEvent.click(screen.getByRole('button', { name: /escolha entre produtos/i }));
    fireEvent.click(screen.getByRole('button', { name: /adicionar opções/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('tab', { name: /pratos/i }));
    fireEvent.click(within(dialogo).getByRole('button', { name: /todos de pratos/i }));
    fireEvent.click(within(dialogo).getByRole('button', { name: /^adicionar 2$/i }));

    const campoQuantidade = screen.getByRole('spinbutton', { name: 'Quantidade' });
    fireEvent.change(campoQuantidade, { target: { value: '2' } });
    fireEvent.blur(campoQuantidade);

    expect(within(screen.getByTestId('previa-do-combo')).getByText('Casal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('combo-salvar'));
    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const [payload, foto] = onSalvar.mock.calls[0];
    expect(foto).toBeUndefined();
    expect(payload).toMatchObject({ name: 'Casal', price: 59.9, dynamic_pricing: false, is_active: true });
    expect(payload.groups).toHaveLength(1);
    expect(payload.groups[0]).toMatchObject({
      product_id: null, is_required: true, min_selections: 2, max_selections: 2,
    });
    expect(payload.groups[0].product_options.map((o: { product_id: string }) => o.product_id)).toEqual(['p1', 'p2']);
  });

  it('salvar com pendência aponta o que falta e não grava', () => {
    const { onSalvar } = abrir();
    fireEvent.click(screen.getByRole('button', { name: /escolha entre produtos/i }));
    fireEvent.click(screen.getByTestId('combo-salvar'));
    expect(onSalvar).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Dê um nome e mais 2');
    expect(screen.getByText('Adicione opções')).toBeInTheDocument();
  });

  it('brinde grava preço zero em todas as opções do grupo', async () => {
    const combo = {
      id: 'c1', store: 's1', name: 'Kit', slug: 'kit', description: '', price: 40, is_active: true,
      featured: false, track_stock: false, stock_quantity: 0, metadata: {},
      groups: [{
        id: 'g1', product_id: null, product_name: '', title: 'Bebida', is_required: true,
        min_selections: 1, max_selections: 1, allow_duplicate_variants: false, position: 0, variant_limits: [],
        product_options: [{ product_id: 'p3', name: 'Suco', price: 8, max_selections: 1 }],
      }],
    } as unknown as StoreCombo;
    const { onSalvar } = abrir({ combo });
    fireEvent.click(screen.getByRole('button', { name: /brinde/i }));
    expect(screen.getByText('Grátis')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('combo-salvar'));
    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    expect(onSalvar.mock.calls[0][0].groups[0].product_options[0].price_override).toBe(0);
  });

  it('soma das escolhas mostra "a partir de" com o preço mínimo real', () => {
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: /soma das escolhas/i }));
    fireEvent.click(screen.getByRole('button', { name: /escolha entre produtos/i }));
    fireEvent.click(screen.getByRole('button', { name: /adicionar opções/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: /carne de panela/i }));
    fireEvent.click(within(dialogo).getByRole('button', { name: /^adicionar 1$/i }));
    const previa = screen.getByTestId('previa-do-combo');
    expect(within(previa).getByText('a partir de')).toBeInTheDocument();
    expect(previa).toHaveTextContent('R$ 35,00');
  });

  it('categoria inteira entra no grupo com um toque, sem repetir quem já está', async () => {
    const { onSalvar } = abrir();
    fireEvent.change(screen.getByLabelText('Nome do combo'), { target: { value: 'Semanal' } });
    preencherPreco('100');
    fireEvent.click(screen.getByRole('button', { name: /escolha entre produtos/i }));
    fireEvent.click(screen.getByRole('button', { name: /categoria inteira/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /pratos · 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /categoria inteira/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /pratos · 2/i }));
    fireEvent.click(screen.getByTestId('combo-salvar'));
    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const ids = onSalvar.mock.calls[0][0].groups[0].product_options.map((o: { product_id: string }) => o.product_id);
    expect(ids).toEqual(['p1', 'p2']);
  });
});

