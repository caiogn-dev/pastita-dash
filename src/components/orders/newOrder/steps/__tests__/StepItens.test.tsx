import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const getProducts = jest.fn();
jest.mock('../../../../../services/products', () => ({ productsService: { getProducts: (...a: unknown[]) => getProducts(...a) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { StepItens } from '../StepItens';

const produto = (i: number) => ({ id: `p${i}`, name: `Produto ${String(i).padStart(2, '0')}`, price: 10 }) as never;

beforeEach(() => getProducts.mockReset());

test('carrega todas as páginas: produto além do 40º aparece e é achado na busca', async () => {
  // A Ivoneth tem 58 produtos ativos. Com uma página só de 40, 18 nunca
  // apareciam no Novo pedido, nem buscando pelo nome.
  getProducts
    .mockResolvedValueOnce({ results: Array.from({ length: 40 }, (_, i) => produto(i + 1)), next: 'page=2' })
    .mockResolvedValueOnce({ results: Array.from({ length: 18 }, (_, i) => produto(i + 41)), next: null });
  render(<StepItens storeId="loja" cart={[]} onAdd={jest.fn()} onQtyChange={jest.fn()} onRemove={jest.fn()} />);
  fireEvent.change(await screen.findByPlaceholderText(/buscar produto/i), { target: { value: 'Produto 58' } });
  expect(await screen.findByRole('button', { name: /Produto 58/ })).toBeInTheDocument();
  expect(getProducts).toHaveBeenCalledTimes(2);
});

test('tocar de novo num produto que já está no carrinho soma uma unidade', async () => {
  getProducts.mockResolvedValueOnce({ results: [produto(1)], next: null });
  const onQtyChange = jest.fn();
  const onAdd = jest.fn();
  render(
    <StepItens storeId="loja" cart={[{ product: produto(1), quantity: 2 }]} onAdd={onAdd} onQtyChange={onQtyChange} onRemove={jest.fn()} />,
  );
  await waitFor(() => expect(getProducts).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole('button', { name: /Adicionar Produto 01/ }));
  expect(onQtyChange).toHaveBeenCalledWith('p1', 3);
  expect(onAdd).not.toHaveBeenCalled();
});
