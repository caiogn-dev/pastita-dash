import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockVariant: storesApi.StoreProductVariant = {
  id: 'var-1',
  name: 'Tamanho G',
  sku: 'SKU-G',
  price: 12.5,
  effective_price: 12.5,
  stock_quantity: 7,
  is_active: true,
} as storesApi.StoreProductVariant;

describe('VariantsManager — acessibilidade dos botões icon-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storesApi.getProductVariants as jest.Mock).mockResolvedValue([mockVariant]);
  });

  it('expõe nome acessível nos botões de editar e excluir variante', async () => {
    render(<VariantsManager productId="prod-1" />);

    // Botões icon-only precisam de nome acessível para leitores de tela.
    const editar = await screen.findByRole('button', { name: /editar variante tamanho g/i });
    const excluir = await screen.findByRole('button', { name: /excluir variante tamanho g/i });

    expect(editar).toBeInTheDocument();
    expect(excluir).toBeInTheDocument();
  });

  it('mantém o título carregado na lista', async () => {
    render(<VariantsManager productId="prod-1" />);
    await waitFor(() => expect(screen.getByText('Tamanho G')).toBeInTheDocument());
  });
});
