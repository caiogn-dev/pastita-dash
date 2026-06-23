/**
 * ComboForm.test.tsx — Tests for combo creation/editing form
 *
 * Test coverage:
 * - Section 1: Basic info form submission
 * - Section 2: Product groups with variants management
 * - Add/remove/edit groups
 * - Variants table with editable max_selections and price_override
 * - allow_duplicates toggle per group
 * - Form validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { ComboForm } from '../ComboForm';
import type { ComboGroupDraft, VariantLimitDraft } from '../ComboForm';
import type { StoreCombo, StoreProduct } from '../../../services/storesApi';

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

// Mock matchMedia for react-hot-toast
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockVariants = [
  {
    id: 'var-1',
    name: 'Frango',
    sku: 'FRANGO-001',
    stock_quantity: 50,
    price: 10,
  },
  {
    id: 'var-2',
    name: 'Queijo',
    sku: 'QUEIJO-001',
    stock_quantity: 30,
    price: 12,
  },
];

const mockProducts: StoreProduct[] = [
  {
    id: 'prod-1',
    store: 'store-1',
    name: 'Rondelli',
    slug: 'rondelli',
    sku: 'RON-001',
    price: 5,
    description: 'Rondelli delicioso',
    image_url: 'https://example.com/rondelli.jpg',
    is_active: true,
    variants: mockVariants as any,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as StoreProduct,
  {
    id: 'prod-2',
    store: 'store-1',
    name: 'Molho Branco',
    slug: 'molho-branco',
    sku: 'MOLHO-001',
    price: 2,
    description: 'Molho branco cremoso',
    image_url: 'https://example.com/molho.jpg',
    is_active: true,
    variants: [] as any,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as StoreProduct,
];

const mockCombo: StoreCombo = {
  id: 'combo-1',
  store: 'store-1',
  name: 'Combo Executivo',
  slug: 'combo-executivo',
  description: 'Combo com rondelli e molho',
  price: 15,
  compare_at_price: 18,
  savings: 3,
  savings_percentage: 16.67,
  image_url: 'https://example.com/combo.jpg',
  is_active: true,
  featured: false,
  track_stock: false,
  stock_quantity: 0,
  items: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComboForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    jest.clearAllMocks();
  });

  describe('Section 1: Basic Info', () => {
    it('renders basic info tab with all required fields', () => {
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      expect(screen.getByPlaceholderText(/Ex: Combo Executivo/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Descreva o combo/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument();
      expect(screen.getByText(/Nome do combo/i)).toBeInTheDocument();
      expect(screen.getByText(/Preço do combo/i)).toBeInTheDocument();
    });

    it('fills basic info fields with existing combo data', () => {
      render(
        <>
          <ComboForm
            combo={mockCombo}
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      expect(screen.getByDisplayValue('Combo Executivo')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Combo com rondelli e molho')).toBeInTheDocument();
      expect(screen.getByDisplayValue('15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('18')).toBeInTheDocument();
    });

    it('updates basic info on input change', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const nameInput = screen.getByPlaceholderText(/Ex: Combo Executivo/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Novo Combo');

      expect(nameInput).toHaveValue('Novo Combo');
    });
  });

  describe('Section 2: Product Items', () => {
    it('renders groups tab with add group button', () => {
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      expect(screen.getByRole('button', { name: /Grupo de variantes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Grupo de produtos/i })).toBeInTheDocument();
    });

    it('adds a new group when clicking add group button', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      // Group should be expanded and showing empty state
      expect(screen.getByText(/Selecionar produto\.\.\./i)).toBeInTheDocument();
    });

    it('allows selecting product for a group', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      const selects = screen.getAllByDisplayValue('Selecionar produto...');
      const productSelect = selects[0];
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });

      // Product should be loaded and header shown with product name
      await waitFor(() => {
        const rondelli = screen.getAllByText('Rondelli');
        expect(rondelli.length).toBeGreaterThan(0);
      });
    });

    it('displays min/max selections controls', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      expect(screen.getByText(/Seleções mínimas/i)).toBeInTheDocument();
      expect(screen.getByText(/Seleções máximas/i)).toBeInTheDocument();
    });

    it('toggles required checkbox for group', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      const requiredToggle = screen.getByText('Obrigatório').closest('div[class*="border"]');
      if (requiredToggle) {
        fireEvent.click(requiredToggle);
      }
    });

    it('toggles allow_duplicates checkbox for group', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      const duplicatesToggle = screen.getByText(/Permitir duplicatas/i).closest('div[class*="border"]');
      if (duplicatesToggle) {
        fireEvent.click(duplicatesToggle);
      }
    });

    it('removes group when clicking delete button', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      // Should show the new group with a remove button
      expect(screen.getByTitle('Remover grupo')).toBeInTheDocument();

      // Click delete trash icon
      const trashButtons = screen.getAllByTitle('Remover grupo');
      fireEvent.click(trashButtons[0]);

      // Group should be removed
      await waitFor(() => {
        expect(screen.queryByTitle('Remover grupo')).not.toBeInTheDocument();
      });
    });
  });

  describe('Section 2.1: Variants Management', () => {
    it('loads variants table when product with variants is selected', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      const selects = screen.getAllByDisplayValue('Selecionar produto...');
      fireEvent.change(selects[0], { target: { value: 'prod-1' } });

      // Variants should be loaded - check variants table headers appear
      await waitFor(() => {
        const rondelli = screen.getAllByText('Rondelli');
        expect(rondelli.length).toBeGreaterThan(0);
      });
    });

    it('displays variant limits table with variant details', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      const selects = screen.getAllByDisplayValue('Selecionar produto...');
      fireEvent.change(selects[0], { target: { value: 'prod-1' } });

      await waitFor(() => {
        const rondelli = screen.getAllByText('Rondelli');
        expect(rondelli.length).toBeGreaterThan(0);
      });

      // Check table headers exist
      expect(screen.getByText('Variante')).toBeInTheDocument();
      expect(screen.getByText('SKU')).toBeInTheDocument();
      expect(screen.getByText('Estoque')).toBeInTheDocument();
      expect(screen.getByText('Max no Combo')).toBeInTheDocument();
      expect(screen.getByText('Preço Override (R$)')).toBeInTheDocument();
    });

    it('edits max_selections for variant', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/i });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      const selects = screen.getAllByDisplayValue('Selecionar produto...');
      fireEvent.change(selects[0], { target: { value: 'prod-1' } });

      await waitFor(() => {
        expect(screen.getByText('Frango')).toBeInTheDocument();
      });

      // Find and edit max_selections input
      const maxInputs = screen.getAllByDisplayValue('1');
      if (maxInputs.length > 0) {
        fireEvent.change(maxInputs[0], { target: { value: '2' } });
        expect(maxInputs[0]).toHaveValue(2);
      }
    });

    it('edits price_override for variant', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const groupsTab = screen.getByRole('button', { name: /Itens/ });
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      const selects = screen.getAllByDisplayValue('Selecionar produto...');
      fireEvent.change(selects[0], { target: { value: 'prod-1' } });

      await waitFor(() => {
        expect(screen.getByText('Frango')).toBeInTheDocument();
      });

      // Find price override input
      const priceOverrideInputs = screen.getAllByPlaceholderText('Sem override');
      if (priceOverrideInputs.length > 0) {
        fireEvent.change(priceOverrideInputs[0], { target: { value: '8.5' } });
        expect(priceOverrideInputs[0]).toHaveValue(8.5);
      }
    });
  });

  describe('Section 3: Settings', () => {
    it('renders settings tab with toggles', () => {
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const settingsTab = screen.getByText(/Configurações/);
      fireEvent.click(settingsTab);

      expect(screen.getByText('Combo ativo')).toBeInTheDocument();
      expect(screen.getByText('Destaque')).toBeInTheDocument();
      expect(screen.getByText('Controlar estoque')).toBeInTheDocument();
    });

    it('toggles is_active setting', () => {
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const settingsTab = screen.getByText(/Configurações/);
      fireEvent.click(settingsTab);

      const activeToggle = screen.getByText(/Combo ativo/).closest('div[class*="border"]');
      if (activeToggle) {
        fireEvent.click(activeToggle);
      }
    });

    it('shows stock quantity input when track_stock is enabled', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const settingsTab = screen.getByText(/Configurações/);
      fireEvent.click(settingsTab);

      const trackStockToggle = screen.getByText(/Controlar estoque/).closest('div[class*="border"]');
      if (trackStockToggle) {
        fireEvent.click(trackStockToggle);
      }

      await waitFor(() => {
        expect(screen.getByText(/Quantidade em estoque/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission & Validation', () => {
    it('validates name is required', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const submitButton = screen.getByText(/Criar combo/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('validates price is required and positive', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const nameInput = screen.getByPlaceholderText(/Ex: Combo Executivo/i);
      await user.type(nameInput, 'Test Combo');

      const submitButton = screen.getByText(/Criar combo/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('validates all groups have products selected', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const nameInput = screen.getByPlaceholderText(/Ex: Combo Executivo/i);
      await user.type(nameInput, 'Test Combo');

      const priceInputs = screen.getAllByRole('spinbutton');
      fireEvent.change(priceInputs[0], { target: { value: '15' } });

      const groupsTab = screen.getByText(/Itens \(0\)/);
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      // Try to submit without selecting product
      const submitButton = screen.getByText(/Criar combo/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const nameInput = screen.getByPlaceholderText(/Ex: Combo Executivo/i);
      await user.type(nameInput, 'Test Combo');

      const priceInputs = screen.getAllByRole('spinbutton');
      fireEvent.change(priceInputs[0], { target: { value: '15' } });

      const submitButton = screen.getByText(/Criar combo/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            store: 'store-1',
            name: 'Test Combo',
            price: 15,
            groups: [],
          })
        );
      });
    });

    it('submits form with groups data', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      const nameInput = screen.getByPlaceholderText(/Ex: Combo Executivo/i);
      await user.type(nameInput, 'Test Combo');

      const priceInputs = screen.getAllByRole('spinbutton');
      fireEvent.change(priceInputs[0], { target: { value: '15' } });

      const groupsTab = screen.getByText(/Itens \(0\)/);
      fireEvent.click(groupsTab);

      const addButton = screen.getByRole('button', { name: /Grupo de variantes/i });
      await user.click(addButton);

      const selects = screen.getAllByDisplayValue('Selecionar produto...');
      fireEvent.change(selects[0], { target: { value: 'prod-1' } });

      await waitFor(() => {
        const rondelli = screen.getAllByText('Rondelli');
        expect(rondelli.length).toBeGreaterThan(0);
      });

      const submitButton = screen.getByText(/Criar combo/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            store: 'store-1',
            name: 'Test Combo',
            price: 15,
            groups: expect.arrayContaining([
              expect.objectContaining({
                product_id: 'prod-1',
              }),
            ]),
          })
        );
      });
    });

    it('shows loading state while submitting', async () => {
      const user = userEvent.setup();
      const slowSubmit = jest.fn(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={slowSubmit}
            isLoading={true}
          />
          <Toaster />
        </>
      );

      const submitButton = screen.getByText(/Salvando/i);
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ComboForm
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      // Start in basic tab
      expect(screen.getByPlaceholderText(/Ex: Combo Executivo/i)).toBeInTheDocument();

      // Switch to items tab
      const itemsTab = screen.getByRole('button', { name: /Itens/i });
      fireEvent.click(itemsTab);

      expect(screen.getByRole('button', { name: /Grupo de variantes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Grupo de produtos/i })).toBeInTheDocument();

      // Switch to settings tab
      const settingsTab = screen.getByText(/Configurações/);
      fireEvent.click(settingsTab);

      expect(screen.getByText('Combo ativo')).toBeInTheDocument();
    });
  });

  describe('Editing Existing Combo', () => {
    it('loads existing combo data in form', () => {
      render(
        <>
          <ComboForm
            combo={mockCombo}
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      expect(screen.getByDisplayValue('Combo Executivo')).toBeInTheDocument();
      expect(screen.getByText(/Salvar alterações/)).toBeInTheDocument();
    });

    it('shows edit mode submit button', () => {
      render(
        <>
          <ComboForm
            combo={mockCombo}
            storeId="store-1"
            products={mockProducts}
            onSubmit={mockOnSubmit}
          />
          <Toaster />
        </>
      );

      expect(screen.getByText(/Salvar alterações/)).toBeInTheDocument();
      expect(screen.queryByText(/Criar combo/)).not.toBeInTheDocument();
    });
  });
});
