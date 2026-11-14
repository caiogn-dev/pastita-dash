/**
 * Variantes no painel (13/11, medido a 390 e 1366 px):
 *   - "Nova variante" quebrava em duas linhas;
 *   - "Ativa" era caixinha nativa azul; pausar um sabor exigia abrir o form;
 *   - ✓ e ✕ minúsculos no lugar de Salvar/Cancelar;
 *   - "R$ 22.90" com ponto;
 *   - sem preço "de" — o desconto do Camarão (40 → 32) não tinha onde morar.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VariantsManager } from '../VariantsManager';
import * as storesApi from '../../../services/storesApi';

jest.mock('../../../services/storesApi', () => ({
  __esModule: true,
  getProductVariants: jest.fn(),
  createProductVariant: jest.fn(),
  updateProductVariant: jest.fn(),
  deleteProductVariant: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true, default: { success: jest.fn(), error: jest.fn() }, success: jest.fn(), error: jest.fn(),
}));
jest.mock('../../../services/logger', () => ({
  __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const v = (id: string, name: string, price: number, extra: Partial<storesApi.StoreProductVariant> = {}) => ({
  id, name, sku: '', price, effective_price: String(price), stock_quantity: 0, is_active: true, ...extra,
}) as storesApi.StoreProductVariant;

const api = storesApi as jest.Mocked<typeof storesApi>;

describe('VariantsManager — UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getProductVariants.mockResolvedValue([
      v('f', 'Frango', 22.9),
      v('c', 'Camarão', 32, { compare_at_price: 40 }),
    ]);
    api.updateProductVariant.mockResolvedValue(v('c', 'Camarão', 32));
    api.createProductVariant.mockResolvedValue(v('n', 'Novo', 10));
  });

  it('preço em reais com vírgula, e o sabor em promoção mostra de/por e o %', async () => {
    render(<VariantsManager productId="p1" />);
    const camarao = (await screen.findByText('Camarão')).closest('li')!;
    expect(within(camarao).getByText('R$ 32,00')).toBeInTheDocument();
    expect(within(camarao).getByText('R$ 40,00')).toBeInTheDocument();
    expect(within(camarao).getByText('−20%')).toBeInTheDocument();
    expect(screen.getByText('R$ 22,90')).toBeInTheDocument();
    expect(screen.queryByText(/22\.90/)).not.toBeInTheDocument();
  });

  it('cada sabor tem um interruptor de vender/pausar na própria linha', async () => {
    render(<VariantsManager productId="p1" />);
    const interruptor = await screen.findByRole('switch', { name: 'Vender Camarão' });
    expect(interruptor).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(interruptor);
    await waitFor(() => expect(api.updateProductVariant).toHaveBeenCalledWith('p1', 'c', { is_active: false }));
    expect(screen.getByRole('switch', { name: 'Vender Camarão' })).toHaveAttribute('aria-checked', 'false');
  });

  it('interruptor volta se a API falhar', async () => {
    api.updateProductVariant.mockRejectedValueOnce(new Error('x'));
    render(<VariantsManager productId="p1" />);
    const interruptor = await screen.findByRole('switch', { name: 'Vender Frango' });
    fireEvent.click(interruptor);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Vender Frango' })).toHaveAttribute('aria-checked', 'true'));
  });

  it('formulário sem caixinha nativa, com Salvar/Cancelar escritos e preço "de"', async () => {
    render(<VariantsManager productId="p1" basePrice={39.9} />);
    fireEvent.click(await screen.findByRole('button', { name: /Nova variante/ }));
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Lombo' } });
    fireEvent.change(screen.getByLabelText('Preço'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Preço antes (riscado)'), { target: { value: '36' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.createProductVariant).toHaveBeenCalledWith('p1', expect.objectContaining({
      name: 'Lombo', price: 30, compare_at_price: 36, is_active: true,
    })));
  });

  it('editar carrega o preço "de" do sabor', async () => {
    render(<VariantsManager productId="p1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar variante Camarão' }));
    expect(screen.getByLabelText('Preço antes (riscado)')).toHaveValue(40);
  });

  it('"Nova variante" não quebra linha', async () => {
    render(<VariantsManager productId="p1" />);
    expect(await screen.findByRole('button', { name: /Nova variante/ })).toHaveClass('whitespace-nowrap');
  });
});
