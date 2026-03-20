/**
 * CombosPage — Gerenciamento de Combos da Loja
 *
 * Permite criar, editar e excluir combos com seus produtos.
 * Os combos aparecem no cardápio do ce-saladas e podem ser adicionados ao carrinho.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  StarIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
  CheckIcon,
  CubeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { Card, Button, Input, Modal, Loading } from '../../components/common';
import { useStore } from '../../hooks';
import storesApi, {
  StoreCombo,
  StoreComboInput,
  StoreComboItemInput,
  StoreProduct as Product,
  createComboWithItems,
  updateComboWithItems,
  deleteCombo,
  getCombos,
} from '../../services/storesApi';
import logger from '../../services/logger';

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number | string) => CURRENCY.format(Number(v));

// ─────────────────────────────────────────────────────────────────────────────
// Combo Item Row — within the form modal
// ─────────────────────────────────────────────────────────────────────────────
interface ComboItemRowProps {
  item: StoreComboItemInput & { _key: string; product_name?: string; product_price?: number };
  products: Product[];
  onUpdate: (key: string, changes: Partial<StoreComboItemInput>) => void;
  onRemove: (key: string) => void;
}

const ComboItemRow: React.FC<ComboItemRowProps> = ({ item, products, onUpdate, onRemove }) => {
  const selectedProduct = products.find(p => p.id === item.product);
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700">
      <div className="flex-1 min-w-0">
        <select
          value={item.product}
          onChange={e => onUpdate(item._key, { product: e.target.value })}
          className="w-full text-sm rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Selecionar produto...</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} — {fmt(p.price)}
            </option>
          ))}
        </select>
        {selectedProduct && (
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{fmt(selectedProduct.price)} cada</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onUpdate(item._key, { quantity: Math.max(1, item.quantity - 1) })}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 dark:border-zinc-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700"
        >−</button>
        <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">{item.quantity}</span>
        <button
          type="button"
          onClick={() => onUpdate(item._key, { quantity: item.quantity + 1 })}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 dark:border-zinc-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700"
        >+</button>
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
// Combo Form Modal — Create / Edit
// ─────────────────────────────────────────────────────────────────────────────
type ComboItemDraft = StoreComboItemInput & { _key: string; product_name?: string; product_price?: number };

interface ComboFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  combo: StoreCombo | null;
  storeId: string;
  products: Product[];
  onSave: () => void;
}

const emptyForm = (): StoreComboInput & { items: ComboItemDraft[] } => ({
  store: '',
  name: '',
  description: '',
  price: 0,
  compare_at_price: undefined,
  image_url: '',
  is_active: true,
  featured: false,
  track_stock: false,
  stock_quantity: 0,
  items: [],
});

const ComboFormModal: React.FC<ComboFormModalProps> = ({
  isOpen, onClose, combo, storeId, products, onSave,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'items' | 'settings'>('basic');

  useEffect(() => {
    if (!isOpen) return;
    if (combo) {
      setForm({
        store: combo.store,
        name: combo.name,
        description: combo.description || '',
        price: combo.price,
        compare_at_price: combo.compare_at_price,
        image_url: combo.image_url || '',
        is_active: combo.is_active,
        featured: combo.featured,
        track_stock: combo.track_stock,
        stock_quantity: combo.stock_quantity,
        items: combo.items.map(i => ({
          _key: i.id,
          product: i.product,
          quantity: i.quantity,
          allow_customization: i.allow_customization,
          customization_options: i.customization_options,
        })),
      });
    } else {
      setForm({ ...emptyForm(), store: storeId });
    }
    setActiveTab('basic');
  }, [isOpen, combo, storeId]);

  const set = (field: string, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { _key: `new_${Date.now()}`, product: '', quantity: 1 }],
    }));
  };

  const updateItem = (key: string, changes: Partial<StoreComboItemInput>) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(i => i._key === key ? { ...i, ...changes } : i),
    }));
  };

  const removeItem = (key: string) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i._key !== key) }));
  };

  // Derived savings preview
  const itemsTotal = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const p = products.find(p => p.id === item.product);
      return sum + (p ? Number(p.price) * item.quantity : 0);
    }, 0);
  }, [form.items, products]);

  const savingsPreview = itemsTotal > 0 && form.price > 0
    ? Math.max(0, itemsTotal - form.price)
    : 0;
  const savingsPct = itemsTotal > 0 && savingsPreview > 0
    ? Math.round((savingsPreview / itemsTotal) * 100)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (!form.price || form.price <= 0) { toast.error('Preço inválido'); return; }

    const validItems = form.items.filter(i => i.product);
    if (form.items.length > 0 && validItems.length !== form.items.length) {
      toast.error('Selecione um produto para cada item do combo');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        store: storeId,
        name: form.name.trim(),
        description: form.description?.trim() || '',
        price: form.price,
        compare_at_price: form.compare_at_price || undefined,
        image_url: form.image_url?.trim() || undefined,
        is_active: form.is_active,
        featured: form.featured,
        track_stock: form.track_stock,
        stock_quantity: form.track_stock ? (form.stock_quantity || 0) : 0,
        items: validItems.map(({ _key: _k, product_name: _pn, product_price: _pp, ...rest }) => rest),
      };

      if (combo) {
        await updateComboWithItems(combo.id, payload);
        toast.success('Combo atualizado!');
      } else {
        await createComboWithItems(payload);
        toast.success('Combo criado!');
      }
      onSave();
      onClose();
    } catch (err) {
      logger.error('Error saving combo:', err);
      toast.error('Erro ao salvar combo');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'basic', label: 'Informações' },
    { key: 'items', label: `Produtos (${form.items.length})` },
    { key: 'settings', label: 'Configurações' },
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={combo ? `Editar Combo — ${combo.name}` : 'Novo Combo'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-0">
        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-zinc-700">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === t.key
                  ? 'text-brand-700 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-500 -mb-px bg-white dark:bg-zinc-900'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
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
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder="Descreva o combo para o cliente..."
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
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
              <div className={`p-3 rounded-lg text-sm ${savingsPreview > 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'}`}>
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
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Adicione os produtos que compõem este combo
              </p>
              <Button type="button" size="sm" onClick={addItem}>
                <PlusIcon className="w-4 h-4 mr-1" />
                Adicionar produto
              </Button>
            </div>
            {form.items.length === 0 ? (
              <div className="text-center py-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-zinc-700">
                <CubeIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-zinc-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-zinc-400">Nenhum produto no combo ainda</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
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
              <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200 dark:border-zinc-700">
                <span className="text-gray-500 dark:text-zinc-400">Valor dos itens separados:</span>
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
                { key: 'featured' as const, label: 'Destaque', desc: 'Aparece em destaque no topo do cardápio', icon: StarIcon },
                { key: 'track_stock' as const, label: 'Controlar estoque', desc: 'Limitar quantidade disponível', icon: TagIcon },
              ].map(({ key, label, desc, icon: Icon }) => {
                const isOn = !!form[key];
                return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                    isOn
                      ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-700'
                      : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}
                  onClick={() => set(key, !isOn)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{desc}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    isOn
                      ? 'bg-brand-600 text-white'
                      : 'border-2 border-gray-300 dark:border-zinc-600'
                  }`}>
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

        <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-200 dark:border-zinc-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : combo ? 'Salvar alterações' : 'Criar combo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Combo Card
// ─────────────────────────────────────────────────────────────────────────────
interface ComboCardProps {
  combo: StoreCombo;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onToggleFeatured: () => void;
}

const ComboCard: React.FC<ComboCardProps> = ({ combo, onEdit, onDelete, onToggleActive, onToggleFeatured }) => {
  const savings = combo.savings || 0;
  const savingsPct = combo.savings_percentage || 0;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border transition-all hover:shadow-md ${
      combo.is_active
        ? 'border-gray-200 dark:border-zinc-700'
        : 'border-gray-100 dark:border-zinc-800 opacity-60'
    }`}>
      {/* Image / Placeholder */}
      <div className="relative h-40 rounded-t-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700">
        {combo.image_url ? (
          <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CubeIcon className="w-12 h-12 text-gray-300 dark:text-zinc-600" />
          </div>
        )}
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {!combo.is_active && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800/80 text-gray-100">Inativo</span>
          )}
          {combo.featured && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/90 text-white">⭐ Destaque</span>
          )}
          {savingsPct > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/90 text-white">{savingsPct}% OFF</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{combo.name}</h3>
          {combo.description && (
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{combo.description}</p>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(combo.price)}</span>
          {combo.compare_at_price && Number(combo.compare_at_price) > combo.price && (
            <span className="text-sm text-gray-400 line-through">{fmt(combo.compare_at_price)}</span>
          )}
          {savings > 0 && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">economize {fmt(savings)}</span>
          )}
        </div>

        {/* Items */}
        {combo.items.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
              {combo.items.length} produto{combo.items.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-1">
              {combo.items.slice(0, 4).map(item => (
                <span key={item.id} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                  {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.product_name}
                </span>
              ))}
              {combo.items.length > 4 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500">
                  +{combo.items.length - 4}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-zinc-500 italic">Sem produtos fixos (combo aberto)</p>
        )}

        {/* Stock */}
        {combo.track_stock && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${combo.stock_quantity > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              {combo.stock_quantity > 0 ? `${combo.stock_quantity} em estoque` : 'Sem estoque'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={onToggleActive}
            title={combo.is_active ? 'Desativar' : 'Ativar'}
            className={`p-1.5 rounded-md transition-colors ${
              combo.is_active
                ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            {combo.is_active ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggleFeatured}
            title={combo.featured ? 'Remover destaque' : 'Destacar'}
            className={`p-1.5 rounded-md transition-colors ${
              combo.featured
                ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            {combo.featured ? <StarIconSolid className="w-4 h-4" /> : <StarIcon className="w-4 h-4" />}
          </button>
          <div className="flex-1" />
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <PencilIcon className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Excluir"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export const CombosPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, storeName } = useStore();
  const storeId = contextStoreId || routeStoreId;

  const [combos, setCombos] = useState<StoreCombo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<StoreCombo | null>(null);
  const [deletingCombo, setDeletingCombo] = useState<StoreCombo | null>(null);

  const loadData = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      setLoading(true);
      const [combosRes, productsRes] = await Promise.all([
        getCombos(storeId),
        storesApi.getProducts({ store: storeId, status: 'active', page_size: 200 }),
      ]);
      setCombos(combosRes.results || []);
      setProducts(productsRes.results || []);
    } catch (err) {
      logger.error('Error loading combos:', err);
      toast.error('Erro ao carregar combos');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let list = combos;
    if (filterActive === 'active') list = list.filter(c => c.is_active);
    if (filterActive === 'inactive') list = list.filter(c => !c.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    return list;
  }, [combos, search, filterActive]);

  const stats = useMemo(() => ({
    total: combos.length,
    active: combos.filter(c => c.is_active).length,
    featured: combos.filter(c => c.featured).length,
    withItems: combos.filter(c => c.items.length > 0).length,
    avgSavings: combos.length > 0
      ? combos.reduce((s, c) => s + (c.savings_percentage || 0), 0) / combos.length
      : 0,
  }), [combos]);

  const handleEdit = (combo: StoreCombo) => { setEditingCombo(combo); setIsFormOpen(true); };
  const handleCreate = () => { setEditingCombo(null); setIsFormOpen(true); };

  const handleDelete = async () => {
    if (!deletingCombo) return;
    try {
      await deleteCombo(deletingCombo.id);
      toast.success('Combo excluído');
      setDeletingCombo(null);
      loadData();
    } catch {
      toast.error('Erro ao excluir combo');
    }
  };

  const handleToggleActive = async (combo: StoreCombo) => {
    try {
      await storesApi.updateCombo(combo.id, { is_active: !combo.is_active });
      setCombos(prev => prev.map(c => c.id === combo.id ? { ...c, is_active: !c.is_active } : c));
    } catch {
      toast.error('Erro ao atualizar combo');
    }
  };

  const handleToggleFeatured = async (combo: StoreCombo) => {
    try {
      await storesApi.updateCombo(combo.id, { featured: !combo.featured });
      setCombos(prev => prev.map(c => c.id === combo.id ? { ...c, featured: !c.featured } : c));
    } catch {
      toast.error('Erro ao atualizar combo');
    }
  };

  if (!storeId) {
    return (
      <div className="p-6 text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nenhuma loja selecionada</h2>
        <p className="text-gray-500 dark:text-zinc-400 mb-4">Selecione uma loja para gerenciar combos.</p>
        <Button onClick={() => navigate('/stores')}>Ver Lojas</Button>
      </div>
    );
  }

  if (loading && combos.length === 0) return <Loading />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Combos</h1>
          <p className="text-gray-500 dark:text-zinc-400">
            {storeName ? `Combos de ${storeName}` : 'Gerencie combos e kits de produtos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadData} title="Atualizar">
            <ArrowPathIcon className="w-5 h-5" />
          </Button>
          <Button onClick={handleCreate}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Novo Combo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900 dark:text-white' },
          { label: 'Ativos', value: stats.active, color: 'text-green-600 dark:text-green-400' },
          { label: 'Destaques', value: stats.featured, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Com produtos', value: stats.withItems, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Economia média', value: `${stats.avgSavings.toFixed(0)}%`, color: 'text-brand-600 dark:text-brand-400' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar combos..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                filterActive === f
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CubeIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {search || filterActive !== 'all' ? 'Nenhum combo encontrado' : 'Nenhum combo criado'}
          </h3>
          <p className="text-gray-500 dark:text-zinc-400 mb-4">
            {search || filterActive !== 'all'
              ? 'Tente outros filtros'
              : 'Crie combos para aumentar o ticket médio do seu cardápio'}
          </p>
          {!search && filterActive === 'all' && (
            <Button onClick={handleCreate}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Criar primeiro combo
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(combo => (
            <ComboCard
              key={combo.id}
              combo={combo}
              onEdit={() => handleEdit(combo)}
              onDelete={() => setDeletingCombo(combo)}
              onToggleActive={() => handleToggleActive(combo)}
              onToggleFeatured={() => handleToggleFeatured(combo)}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <ComboFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingCombo(null); }}
        combo={editingCombo}
        storeId={storeId}
        products={products}
        onSave={loadData}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deletingCombo}
        onClose={() => setDeletingCombo(null)}
        title="Excluir Combo"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-zinc-400">
            Tem certeza que deseja excluir o combo <strong>{deletingCombo?.name}</strong>?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeletingCombo(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CombosPage;
