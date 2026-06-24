/**
 * ComboForm — Reusable combo creation/editing component
 *
 * Handles:
 * - Section 1: Basic info (name, slug, price, description, image, is_active)
 * - Section 2: Product Groups with variants management
 *   - Product selector
 *   - Min/max selections
 *   - allow_duplicates toggle
 *   - Variants table with max_in_combo editable
 * - Section 3: Settings (featured, track_stock, etc.)
 * - Save & Preview button
 */
import React, { useState } from 'react';
import { PlusIcon, TrashIcon, CheckIcon, CubeIcon, StarIcon, EyeIcon, TagIcon, ChevronDownIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Input, Button } from '../common';
import { StoreCombo, StoreComboInput, StoreComboPayload, StoreProduct as Product } from '../../services/storesApi';

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number | string) => CURRENCY.format(Number(v));

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Variant limit draft for editing in UI */
export interface VariantLimitDraft {
  _key: string;
  variant_id: string;
  variant_name: string;
  variant_sku?: string;
  stock: number;
  max_selections: number;
  price_override?: number;
}

/** Product option draft (grupo do tipo "escolha N produtos") */
export interface ProductOptionDraft {
  _key: string;
  product_id: string;
  product_name: string;
  max_selections: number;
  price_override?: number;
}

/** Product group draft for editing in UI */
export interface ComboGroupDraft {
  _key: string;
  // 'variant' = produto-âncora + variantes; 'product' = título + lista de produtos.
  group_type: 'variant' | 'product';
  product_id: string;
  product_name: string;
  title: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  allow_duplicate_variants: boolean;
  position: number;
  variant_limits: VariantLimitDraft[];
  product_options: ProductOptionDraft[];
  _expanded?: boolean;
}

export interface ComboFormProps {
  combo?: StoreCombo | null;
  storeId: string;
  products: Product[];
  onSubmit: (data: StoreComboPayload) => Promise<void>;
  isLoading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// VariantLimitRow — Editable row for variant limits in group
// ─────────────────────────────────────────────────────────────────────────────
interface VariantLimitRowProps {
  limit: VariantLimitDraft;
  onUpdate: (key: string, changes: Partial<VariantLimitDraft>) => void;
}

const VariantLimitRow: React.FC<VariantLimitRowProps> = ({ limit, onUpdate }) => {
  return (
    <tr className="border-t border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
      <td className="px-3 py-2 text-sm text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
        {limit.variant_name}
      </td>
      <td className="px-3 py-2 text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
        {limit.variant_sku || '—'}
      </td>
      <td className="px-3 py-2 text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
        {limit.stock}
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min="1"
          value={limit.max_selections}
          onChange={e => onUpdate(limit._key, { max_selections: parseInt(e.target.value) || 1 })}
          className="w-16 text-sm rounded-md border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-900 dark:text-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Sem override"
          value={limit.price_override ?? ''}
          onChange={e => onUpdate(limit._key, { price_override: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="w-24 text-sm rounded-md border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-900 dark:text-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </td>
    </tr>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ComboGroupRow — Expandable editor for product group
// ─────────────────────────────────────────────────────────────────────────────
interface ComboGroupRowProps {
  group: ComboGroupDraft;
  products: Product[];
  onUpdate: (key: string, changes: Partial<ComboGroupDraft>) => void;
  onRemove: (key: string) => void;
}

const ComboGroupRow: React.FC<ComboGroupRowProps> = ({ group, products, onUpdate, onRemove }) => {
  const selectedProduct = products.find(p => p.id === group.product_id);

  return (
    <div className="border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)] rounded-lg overflow-hidden bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[var(--dark-bg-base,#0a0a0a)] cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors"
        onClick={() => onUpdate(group._key, { _expanded: !group._expanded })}>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-500 transition-transform ${group._expanded ? 'rotate-180' : ''}`}
        />
        <div className="flex-1">
          <p className="font-medium text-gray-900 dark:text-white">
            {group.group_type === 'product'
              ? (group.title || 'Grupo de produtos')
              : (group.product_name || 'Selecionar produto')}
          </p>
          <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
            {group.group_type === 'product' ? 'Produtos · ' : 'Variantes · '}
            {group.min_selections}–{group.max_selections} seleções{group.allow_duplicate_variants && ' (duplicatas permitidas)'}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(group._key);
          }}
          className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          title="Remover grupo"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Content */}
      {group._expanded && (
        <div className="p-4 space-y-4 border-t border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
          {/* Seleção: produto-âncora (variante) OU título do grupo (produtos) */}
          <div className="grid grid-cols-1 gap-4">
            {group.group_type === 'product' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
                  Título do grupo
                </label>
                <input
                  type="text"
                  value={group.title}
                  onChange={e => onUpdate(group._key, { title: e.target.value })}
                  placeholder="Ex: Escolha suas 5 saladas"
                  className="w-full text-sm rounded-md border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
                  Produto
                </label>
                <select
                  value={group.product_id}
                  onChange={e => onUpdate(group._key, { product_id: e.target.value })}
                  className="w-full text-sm rounded-md border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Selecionar produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selection Rules */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)] mb-2">
                Configurações
              </label>
              <div className="space-y-3">
                {/* Required */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    group.is_required
                      ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-700'
                      : 'border-gray-200 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)]'
                  }`}
                  onClick={() => onUpdate(group._key, { is_required: !group.is_required })}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Obrigatório</p>
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      group.is_required
                        ? 'bg-brand-600 text-white'
                        : 'border-2 border-gray-300 dark:border-[var(--dark-border,#2a2a2a)]'
                    }`}
                  >
                    {group.is_required && <CheckIcon className="w-3 h-3" />}
                  </div>
                </div>

                {/* Allow Duplicates (só variantes) */}
                {group.group_type === 'variant' && (
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    group.allow_duplicate_variants
                      ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-700'
                      : 'border-gray-200 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)]'
                  }`}
                  onClick={() => onUpdate(group._key, { allow_duplicate_variants: !group.allow_duplicate_variants })}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Permitir duplicatas de variantes</p>
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      group.allow_duplicate_variants
                        ? 'bg-brand-600 text-white'
                        : 'border-2 border-gray-300 dark:border-[var(--dark-border,#2a2a2a)]'
                    }`}
                  >
                    {group.allow_duplicate_variants && <CheckIcon className="w-3 h-3" />}
                  </div>
                </div>
                )}
              </div>
            </div>

            {/* Min/Max Selections */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Seleções mínimas"
                type="number"
                min="0"
                value={group.min_selections}
                onChange={e => onUpdate(group._key, { min_selections: parseInt(e.target.value) || 0 })}
              />
              <Input
                label="Seleções máximas"
                type="number"
                min="1"
                value={group.max_selections}
                onChange={e => onUpdate(group._key, { max_selections: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Variantes (grupo do tipo variante) */}
          {group.group_type === 'variant' && group.variant_limits.length > 0 && (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300 dark:border-[var(--dark-border,#2a2a2a)]">
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                      Variante
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                      SKU
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                      Estoque
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                      Max no Combo
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
                      Preço Override (R$)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.variant_limits.map(limit => (
                    <VariantLimitRow
                      key={limit._key}
                      limit={limit}
                      onUpdate={(key, changes) => {
                        const newLimits = group.variant_limits.map(l =>
                          l._key === key ? { ...l, ...changes } : l
                        );
                        onUpdate(group._key, { variant_limits: newLimits });
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {group.group_type === 'variant' && group.variant_limits.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] text-center py-3">
              Nenhuma variante neste produto
            </p>
          )}

          {/* Checklist de produtos (grupo do tipo produtos) */}
          {group.group_type === 'product' && (
            <ProductOptionsChecklist
              group={group}
              products={products}
              onUpdate={onUpdate}
            />
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProductOptionsChecklist — checklist de produtos para grupo do tipo "produtos"
// ─────────────────────────────────────────────────────────────────────────────
interface ProductOptionsChecklistProps {
  group: ComboGroupDraft;
  products: Product[];
  onUpdate: (key: string, changes: Partial<ComboGroupDraft>) => void;
}

const ProductOptionsChecklist: React.FC<ProductOptionsChecklistProps> = ({ group, products, onUpdate }) => {
  const selectedByProduct = new Map(group.product_options.map(o => [o.product_id, o]));

  const toggle = (product: Product) => {
    const existing = selectedByProduct.get(product.id);
    const next = existing
      ? group.product_options.filter(o => o.product_id !== product.id)
      : [
          ...group.product_options,
          {
            _key: product.id,
            product_id: product.id,
            product_name: product.name,
            max_selections: 1,
            price_override: undefined,
          },
        ];
    onUpdate(group._key, { product_options: next });
  };

  const patch = (productId: string, changes: Partial<ProductOptionDraft>) => {
    onUpdate(group._key, {
      product_options: group.product_options.map(o =>
        o.product_id === productId ? { ...o, ...changes } : o
      ),
    });
  };

  if (products.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] text-center py-3">
        Nenhum produto cadastrado na loja
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-2">
        Marque os produtos que o cliente pode escolher neste grupo ({group.product_options.length} selecionado{group.product_options.length === 1 ? '' : 's'})
      </p>
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {products.map(product => {
          const opt = selectedByProduct.get(product.id);
          const checked = !!opt;
          return (
            <div
              key={product.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                checked
                  ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-700'
                  : 'border-gray-200 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)]'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(product)}
                className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${
                  checked
                    ? 'bg-brand-600 text-white'
                    : 'border-2 border-gray-300 dark:border-[var(--dark-border,#2a2a2a)]'
                }`}
                aria-label={checked ? `Remover ${product.name}` : `Adicionar ${product.name}`}
              >
                {checked && <CheckIcon className="w-3 h-3" />}
              </button>
              <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">{product.name}</span>
              {checked && (
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">max</label>
                  <input
                    type="number"
                    min="1"
                    value={opt!.max_selections}
                    onChange={e => patch(product.id, { max_selections: parseInt(e.target.value) || 1 })}
                    className="w-14 text-sm rounded-md border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-900 dark:text-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="R$ override"
                    value={opt!.price_override ?? ''}
                    onChange={e => patch(product.id, { price_override: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-24 text-sm rounded-md border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-900 dark:text-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ComboForm Component
// ─────────────────────────────────────────────────────────────────────────────
export const ComboForm: React.FC<ComboFormProps> = ({
  combo,
  storeId,
  products,
  onSubmit,
  isLoading = false,
}) => {
  const [form, setForm] = useState<StoreComboInput & { items: ComboGroupDraft[] }>(() => {
    const sourceGroups = combo?.groups || [];

    const items: ComboGroupDraft[] = sourceGroups.map((item: any, idx: number) => {
      const productId = item.product_id || item.product;
      const product = products.find(p => p.id === productId);
      const variantLimits = item.variant_limits && item.variant_limits.length > 0
        ? item.variant_limits
        : ((product?.variants || []).map((v: any) => ({
            variant_id: v.id,
            variant_name: v.name,
            variant_sku: v.sku,
            stock: v.stock_quantity || 0,
            max_selections: 1,
            price_override: undefined,
          })));
      const productOptions = item.product_options || [];
      // Sem produto-âncora e/ou com product_options → grupo do tipo "produtos".
      const groupType: 'variant' | 'product' =
        productOptions.length > 0 || !productId ? 'product' : 'variant';
      return {
        _key: item.id,
        group_type: groupType,
        product_id: productId || '',
        product_name: item.product_name || product?.name || '',
        title: item.title || '',
        is_required: item.is_required ?? true,
        min_selections: item.min_selections ?? item.quantity ?? 1,
        max_selections: item.max_selections ?? item.quantity ?? 1,
        allow_duplicate_variants: item.allow_duplicate_variants ?? false,
        position: item.position ?? idx,
        variant_limits: variantLimits.map((v: any) => ({
          _key: v.id || v.variant_id,
          variant_id: v.variant_id || v.id,
          variant_name: v.variant_name || v.name,
          variant_sku: v.variant_sku || v.sku,
          stock: v.stock || v.stock_quantity || 0,
          max_selections: v.max_selections || 1,
          price_override: v.price_override ?? undefined,
        })),
        product_options: productOptions.map((o: any) => ({
          _key: o.product_id || o.product,
          product_id: o.product_id || o.product,
          product_name: o.name || o.product_name || '',
          max_selections: o.max_selections || 1,
          price_override: o.price_override ?? undefined,
        })),
        _expanded: false,
      };
    });

    return {
      store: storeId,
      name: combo?.name || '',
      description: combo?.description || '',
      price: combo?.price || 0,
      compare_at_price: combo?.compare_at_price,
      image_url: combo?.image_url || '',
      is_active: combo?.is_active !== undefined ? combo.is_active : true,
      featured: combo?.featured || false,
      track_stock: combo?.track_stock || false,
      stock_quantity: combo?.stock_quantity || 0,
      dynamic_pricing: combo?.dynamic_pricing || false,
      items,
    };
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'groups' | 'settings'>('basic');

  const set = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addGroup = (groupType: 'variant' | 'product') => {
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          _key: `new_${Date.now()}`,
          group_type: groupType,
          product_id: '',
          product_name: '',
          title: '',
          is_required: true,
          min_selections: 1,
          max_selections: groupType === 'product' ? 5 : 1,
          allow_duplicate_variants: groupType === 'product',
          position: prev.items.length,
          variant_limits: [],
          product_options: [],
          _expanded: true,
        },
      ],
    }));
  };

  const updateGroup = (key: string, changes: Partial<ComboGroupDraft>) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(g => {
        if (g._key === key) {
          const updated = { ...g, ...changes };
          // Update product_name when product_id changes
          if (changes.product_id && changes.product_id !== g.product_id) {
            const product = products.find(p => p.id === changes.product_id);
            if (product) {
              updated.product_name = product.name;
              // Load variants from product
              const variants = (product as any)?.variants || [];
              updated.variant_limits = variants.map((v: any, idx: number) => ({
                _key: v.id,
                variant_id: v.id,
                variant_name: v.name,
                variant_sku: v.sku,
                stock: v.stock_quantity || 0,
                max_selections: 1,
                price_override: undefined,
              }));
            }
          }
          return updated;
        }
        return g;
      }),
    }));
  };

  const removeGroup = (key: string) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(g => g._key !== key),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nome obrigatório');
      return;
    }
    // Preço dinâmico pode ser 0 (base): o total vem da soma dos itens selecionados.
    if (!form.dynamic_pricing && (!form.price || form.price <= 0)) {
      toast.error('Preço inválido');
      return;
    }
    if (form.dynamic_pricing && (form.price === undefined || form.price === null || form.price < 0)) {
      toast.error('Preço-base inválido');
      return;
    }

    // Cada grupo precisa estar completo: variante → produto-âncora; produtos → pelo menos 1 opção.
    const incomplete = form.items.filter(g =>
      g.group_type === 'product' ? g.product_options.length === 0 : !g.product_id
    );
    if (incomplete.length > 0) {
      toast.error('Cada grupo precisa de um produto-âncora (variantes) ou ao menos 1 produto (grupo de produtos)');
      return;
    }
    const validItems = form.items;

    try {
      const groups = validItems.map((item, idx) => ({
        product_id: item.group_type === 'product' ? null : item.product_id,
        title: item.group_type === 'product' ? item.title : '',
        is_required: item.is_required,
        min_selections: item.min_selections,
        max_selections: item.max_selections,
        allow_duplicate_variants: item.allow_duplicate_variants,
        position: idx,
        variant_limits: item.group_type === 'product' ? [] : item.variant_limits.map(limit => ({
          variant_id: limit.variant_id,
          max_selections: limit.max_selections,
          price_override: limit.price_override,
        })),
        product_options: item.group_type === 'product' ? item.product_options.map(o => ({
          product_id: o.product_id,
          max_selections: o.max_selections,
          price_override: o.price_override,
        })) : [],
      }));

      const payload: StoreComboPayload = {
        store: storeId,
        name: form.name.trim(),
        description: form.description?.trim() || '',
        price: form.price,
        compare_at_price: form.compare_at_price || undefined,
        image_url: form.image_url?.trim() || undefined,
        is_active: form.is_active,
        featured: form.featured,
        track_stock: form.track_stock,
        stock_quantity: form.track_stock ? form.stock_quantity || 0 : 0,
        dynamic_pricing: form.dynamic_pricing,
        groups,
      };
      await onSubmit(payload);
    } catch (err) {
      // Error handling in parent
    }
  };

  const tabs = [
    { key: 'basic', label: 'Informações' },
    { key: 'groups', label: `Itens (${form.items.length})` },
    { key: 'settings', label: 'Configurações' },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === t.key
                ? 'text-brand-700 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-500 -mb-px bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)]'
                : 'text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] hover:text-gray-700 dark:hover:text-[var(--dark-text-primary,#FAF9F7)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Informações */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <Input
            label="Nome do combo *"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Ex: Combo Executivo, Kit Família..."
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)] mb-1">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Descreva o combo para o cliente..."
              className="w-full rounded-lg border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={form.dynamic_pricing ? 'Preço-base (R$) — itens somam por cima' : 'Preço do combo (R$) *'}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => set('price', parseFloat(e.target.value) || 0)}
              required={!form.dynamic_pricing}
            />
            <Input
              label="Preço original (opcional)"
              type="number"
              min="0"
              step="0.01"
              value={form.compare_at_price || ''}
              onChange={e => set('compare_at_price', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Para exibir tachado"
            />
          </div>
          <Input
            label="URL da imagem"
            value={form.image_url || ''}
            onChange={e => set('image_url', e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      {/* Tab: Itens */}
      {activeTab === 'groups' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
            <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
              Adicione grupos ao combo
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => addGroup('variant')}>
                <PlusIcon className="w-4 h-4 mr-1" />
                Grupo de variantes
              </Button>
              <Button type="button" size="sm" onClick={() => addGroup('product')}>
                <PlusIcon className="w-4 h-4 mr-1" />
                Grupo de produtos
              </Button>
            </div>
          </div>
          {form.items.length === 0 ? (
            <div className="text-center py-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-[var(--dark-border,#2a2a2a)]">
              <CubeIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-2" />
              <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                Nenhum item no combo ainda
              </p>
              <p className="text-xs text-gray-400 dark:text-[var(--dark-text-secondary,#a1a1aa)] mt-1">
                Combos sem itens são válidos (ex: "Monte seu combo")
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {form.items.map((group, idx) => (
                <ComboGroupRow
                  key={group._key}
                  group={group}
                  products={products}
                  onUpdate={updateGroup}
                  onRemove={removeGroup}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Configurações */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {[
              { key: 'is_active' as const, label: 'Combo ativo', desc: 'Visível no cardápio para clientes', icon: EyeIcon },
              {
                key: 'featured' as const,
                label: 'Destaque',
                desc: 'Aparece em destaque no topo do cardápio',
                icon: StarIcon,
              },
              {
                key: 'track_stock' as const,
                label: 'Controlar estoque',
                desc: 'Limitar quantidade disponível',
                icon: TagIcon,
              },
              {
                key: 'dynamic_pricing' as const,
                label: 'Preço dinâmico',
                desc: 'Total = preço-base + soma dos itens selecionados (permite preço-base 0)',
                icon: CurrencyDollarIcon,
              },
            ].map(({ key, label, desc, icon: Icon }) => {
              const isOn = !!form[key];
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                    isOn
                      ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-700'
                      : 'border-gray-200 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)]'
                  }`}
                  onClick={() => set(key, !isOn)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                      <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">{desc}</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      isOn
                        ? 'bg-brand-600 text-white'
                        : 'border-2 border-gray-300 dark:border-[var(--dark-border,#2a2a2a)]'
                    }`}
                  >
                    {isOn && <CheckIcon className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
          {form.track_stock && (
            <Input
              label="Quantidade em estoque"
              type="number"
              min="0"
              value={form.stock_quantity || 0}
              onChange={e => set('stock_quantity', parseInt(e.target.value) || 0)}
            />
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : combo ? 'Salvar alterações' : 'Criar combo'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setActiveTab('basic')}>
          Visualizar
        </Button>
      </div>
    </form>
  );
};

export default ComboForm;
