import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductFormModal } from '../ProductFormModal';

// Mock heavy deps
jest.mock('../../../services/storesApi', () => ({
  __esModule: true,
  default: {
    updateProduct: jest.fn(),
    createProduct: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn() },
}));

jest.mock('../../../components/products/VariantsManager', () => ({
  __esModule: true,
  default: () => <div data-testid="variants-manager" />,
}));

// Mock Modal to render children directly (avoids portal issues)
jest.mock('../../../components/common', () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null,
  Loading: () => <div />,
}));

/**
 * Stub apenas do que este teste precisa controlar — o RESTO vem de verdade.
 *
 * Antes o mock substituía o barrel inteiro por um punhado de componentes, e
 * cada componente novo que o modal passasse a usar quebrava os quatro testes
 * daqui com "Element type is invalid: got undefined" — mensagem que não diz
 * qual componente falta. Já aconteceu duas vezes seguidas (FormChecklist,
 * depois FormSummary e ChoiceCards).
 *
 * Com `requireActual` espalhado antes, o mock deixa de ser uma lista que
 * precisa ser mantida em sincronia com os imports de outro arquivo.
 */
jest.mock('../../../components/ui', () => ({
  ...jest.requireActual('../../../components/ui'),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Button: ({
    children,
    type,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    type?: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type={(type as 'button' | 'submit' | 'reset') || 'button'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const makeProduct = (id: string, name: string) =>
  ({
    id,
    name,
    sku: `SKU-${id}`,
    price: 10,
    store: 'store1',
    description: '',
    short_description: '',
    barcode: '',
    category: null,
    category_name: null,
    product_type: null,
    product_type_name: null,
    type_attributes: {},
    track_stock: true,
    stock_quantity: 0,
    low_stock_threshold: 5,
    allow_backorder: false,
    status: 'active',
    featured: false,
    tags: [],
    meta_title: '',
    meta_description: '',
    main_image: null,
    main_image_url: null,
    compare_at_price: undefined,
    cost_price: undefined,
    is_on_sale: false,
    discount_percentage: null,
    is_paused: false,
    paused_until: null,
    created_at: '',
    updated_at: '',
  } as any);

const flat = [makeProduct('p1', 'Arroz'), makeProduct('p2', 'Feijão')];

describe('ProductFormModal', () => {
  it('seta › navega pro próximo produto', () => {
    render(
      <ProductFormModal
        isOpen
        product={flat[0]}
        categories={[]}
        flatProducts={flat}
        onClose={jest.fn()}
        onSaved={jest.fn()}
        storeId="store1"
      />
    );

    expect(screen.getByDisplayValue('Arroz')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Próximo produto/i));

    expect(screen.getByDisplayValue('Feijão')).toBeInTheDocument();
  });

  it('seta ‹ navega pro produto anterior', () => {
    render(
      <ProductFormModal
        isOpen
        product={flat[1]}
        categories={[]}
        flatProducts={flat}
        onClose={jest.fn()}
        onSaved={jest.fn()}
        storeId="store1"
      />
    );

    expect(screen.getByDisplayValue('Feijão')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Produto anterior/i));

    expect(screen.getByDisplayValue('Arroz')).toBeInTheDocument();
  });

  it('botão anterior desabilitado no primeiro produto', () => {
    render(
      <ProductFormModal
        isOpen
        product={flat[0]}
        categories={[]}
        flatProducts={flat}
        onClose={jest.fn()}
        onSaved={jest.fn()}
        storeId="store1"
      />
    );

    expect(screen.getByLabelText(/Produto anterior/i)).toBeDisabled();
    expect(screen.getByLabelText(/Próximo produto/i)).not.toBeDisabled();
  });

  it('botão próximo desabilitado no último produto', () => {
    render(
      <ProductFormModal
        isOpen
        product={flat[1]}
        categories={[]}
        flatProducts={flat}
        onClose={jest.fn()}
        onSaved={jest.fn()}
        storeId="store1"
      />
    );

    expect(screen.getByLabelText(/Próximo produto/i)).toBeDisabled();
    expect(screen.getByLabelText(/Produto anterior/i)).not.toBeDisabled();
  });

  it('não renderiza nada quando isOpen=false', () => {
    render(
      <ProductFormModal
        isOpen={false}
        product={flat[0]}
        categories={[]}
        flatProducts={flat}
        onClose={jest.fn()}
        onSaved={jest.fn()}
        storeId="store1"
      />
    );

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });
});
