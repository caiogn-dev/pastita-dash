/**
 * ComboForm — Reusable combo creation/editing component
 *
 * Handles:
 * - Section 1: Basic info (name, slug, price, description, image, is_active)
 * - Section 2: Product Groups (add/remove, reorder, variants management)
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  CubeIcon,
  StarIcon,
  EyeIcon,
  EyeSlashIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Input, Button } from '../common';
import { StoreCombo, StoreComboInput, StoreComboItemInput, StoreProduct as Product } from '../../services/storesApi';

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number | string) => CURRENCY.format(Number(v));

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ComboItemDraft = StoreComboItemInput & {
  _key: string;
  product_name?: string;
  product_price?: number;
};

export interface ComboFormProps {
  combo?: StoreCombo | null;
  storeId: string;
  products: Product[];
  onSubmit: (data: StoreComboInput & { items?: ComboItemDraft[] }) => Promise<void>;
  isLoading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ComboItemRow — Editor for individual items in a group
// ─────────────────────────────────────────────────────────────────────────────
interface ComboItemRowProps {
  item: ComboItemDraft;
  products: Product[];
  onUpdate: (key: string, changes: Partial<StoreComboItemInput>) => void;
  onRemove: (key: string) => void;
}

const ComboItemRow: React.FC<ComboItemRowProps> = ({ item, products, onUpdate, onRemove }) => {
  const selectedProduct = products.find(p => p.id === item.product);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
      <div className="flex-1 min-w-0">
        <select
          value={item.product}
          onChange={e => onUpdate(item._key, { product: e.target.value })}
          className="w-full text-sm rounded-md border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Selecionar produto...</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} — {fmt(p.price)}
            </option>
          ))}
        </select>
        {selectedProduct && (
          <p className="text-xs text-gray-400 dark:text-[var(--dark-text-secondary,#a1a1aa)] mt-0.5">
            {fmt(selectedProduct.price)} cada
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onUpdate(item._key, { quantity: Math.max(1, item.quantity - 1) })}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] text-gray-500 hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-hover,#161616)]"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdate(item._key, { quantity: item.quantity + 1 })}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] text-gray-500 hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-hover,#161616)]"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item._key)}
        className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
        title="Remover produto"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
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
  const [form, setForm] = useState<StoreComboInput & { items: ComboItemDraft[] }>(() => ({
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
    items: (combo?.items || []).map(i => ({
      _key: i.id,
      product: i.product,
      quantity: i.quantity,
      allow_customization: i.allow_customization,
      customization_options: i.customization_options,
    })),
  }));

  const [activeTab, setActiveTab] = useState<'basic' | 'items' | 'settings'>('basic');

  const set = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { _key: `new_${Date.now()}`, product: '', quantity: 1 }],
    }));
  };

  const updateItem = (key: string, changes: Partial<StoreComboItemInput>) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(i => (i._key === key ? { ...i, ...changes } : i)),
    }));
  };

  const removeItem = (key: string) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i._key !== key) }));
  };

  // Calculate savings preview
  const itemsTotal = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const p = products.find(p => p.id === item.product);
      return sum + (p ? Number(p.price) * item.quantity : 0);
    }, 0);
  }, [form.items, products]);

  const savingsPreview = itemsTotal > 0 && form.price > 0 ? Math.max(0, itemsTotal - form.price) : 0;
  const savingsPct =
    itemsTotal > 0 && savingsPreview > 0 ? Math.round((savingsPreview / itemsTotal) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nome obrigatório');
      return;
    }
    if (!form.price || form.price <= 0) {
      toast.error('Preço inválido');
      return;
    }

    const validItems = form.items.filter(i => i.product);
    if (form.items.length > 0 && validItems.length !== form.items.length) {
      toast.error('Selecione um produto para cada item do combo');
      return;
    }

    try {
      const payload: StoreComboInput & { items?: ComboItemDraft[] } = {
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
        items: validItems,
      };
      await onSubmit(payload);
    } catch (err) {
      // Error handling in parent
    }
  };

  const tabs = [
    { key: 'basic', label: 'Informações' },
    { key: 'items', label: `Produtos (${form.items.length})` },
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
              label="Preço do combo (R$) *"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => set('price', parseFloat(e.target.value) || 0)}
              required
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
          {/* Savings preview */}
          {itemsTotal > 0 && form.price > 0 && (
            <div
              className={`p-3 rounded-lg text-sm ${
                savingsPreview > 0
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              }`}
            >
              {savingsPreview > 0
                ? `✓ Cliente economiza ${fmt(savingsPreview)} (${savingsPct}%) vs. comprar separado (${fmt(itemsTotal)})`
                : `⚠ Preço do combo (${fmt(form.price)}) maior que soma dos itens (${fmt(itemsTotal)})`}
            </div>
          )}
        </div>
      )}

      {/* Tab: Produtos */}
      {activeTab === 'items' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
              Adicione os produtos que compõem este combo
            </p>
            <Button type="button" size="sm" onClick={addItem}>
              <PlusIcon className="w-4 h-4 mr-1" />
              Adicionar produto
            </Button>
          </div>
          {form.items.length === 0 ? (
            <div className="text-center py-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-[var(--dark-border,#2a2a2a)]">
              <CubeIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-2" />
              <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                Nenhum produto no combo ainda
              </p>
              <p className="text-xs text-gray-400 dark:text-[var(--dark-text-secondary,#a1a1aa)] mt-1">
                Combos sem produtos são válidos (ex: "Monte sua Salada")
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {form.items.map(item => (
                <ComboItemRow
                  key={item._key}
                  item={item}
                  products={products}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}
          {form.items.length > 0 && itemsTotal > 0 && (
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
              <span className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                Valor dos itens separados:
              </span>
              <span className="text-gray-900 dark:text-white">{fmt(itemsTotal)}</span>
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
      </div>
    </form>
  );
};

export default ComboForm;
