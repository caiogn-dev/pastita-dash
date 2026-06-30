import React, { useState, useEffect, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  PhotoIcon,
  TagIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button } from '../../components/ui';
import { Modal } from '../../components/common';
import VariantsManager from '../../components/products/VariantsManager';
import storesApi, {
  StoreProduct as Product,
  StoreProductInput as ProductInput,
  StoreCategory as Category,
  StoreProductType as ProductType,
  CustomField,
} from '../../services/storesApi';
import logger from '../../services/logger';
import { compressImage } from '../../utils/compressImage';
import { PaywallModal } from '../../components/billing/PaywallModal';

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Produto a editar, null para criação, ou objeto parcial com `category` para criação pré-categorizada */
  product?: Product | null | { category?: string | null; [key: string]: unknown };
  /** Lista de categorias disponíveis */
  categories: Category[];
  /** Lista achatada e ordenada de todos os produtos — usada para navegação prev/next */
  flatProducts: Product[];
  onSaved: () => void;
  /** storeId necessário para criar/atualizar produtos */
  storeId?: string;
  /** Tipos de produto disponíveis; se omitido, o componente não renderiza campos de tipo */
  productTypes?: ProductType[];
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  flatProducts,
  onSaved,
  storeId = '',
  productTypes = [],
}) => {
  const isEditing = !!(product && 'id' in product && product.id);
  const editingProduct = isEditing ? (product as Product) : null;

  const [saving, setSaving] = useState(false);
  const [paywall, setPaywall] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'inventory' | 'variants' | 'media' | 'seo'>('basic');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Internal navigation state
  const [currentId, setCurrentId] = useState<string | undefined>(editingProduct?.id);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentId(editingProduct?.id);
    setActiveTab('basic');
  }, [isOpen, product]);

  // Effective product: navigate within flatProducts when currentId changes
  const effectiveProduct = useMemo(() => {
    if (!currentId) return editingProduct;
    return flatProducts.find((p) => p.id === currentId) ?? editingProduct;
  }, [currentId, flatProducts, editingProduct]);

  const idx = flatProducts.findIndex((p) => p.id === currentId);
  const goto = (d: number) => {
    const n = flatProducts[idx + d];
    if (n) setCurrentId(n.id);
  };

  const [formData, setFormData] = useState<ProductInput>({
    store: storeId,
    name: '',
    description: '',
    short_description: '',
    sku: '',
    barcode: '',
    price: 0,
    compare_at_price: undefined,
    cost_price: undefined,
    category: null,
    product_type: null,
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
  });

  // Load form from effectiveProduct (re-runs when currentId changes or modal opens)
  useEffect(() => {
    if (!isOpen) return;

    if (effectiveProduct && 'id' in effectiveProduct && effectiveProduct.id) {
      const p = effectiveProduct as Product;
      setFormData({
        store: storeId || p.store || '',
        name: p.name || '',
        description: p.description || '',
        short_description: p.short_description || '',
        sku: p.sku || '',
        barcode: p.barcode || '',
        price: p.price || 0,
        compare_at_price: p.compare_at_price,
        cost_price: p.cost_price,
        category: p.category ?? null,
        product_type: p.product_type ?? null,
        type_attributes: p.type_attributes || {},
        track_stock: p.track_stock ?? true,
        stock_quantity: p.stock_quantity || 0,
        low_stock_threshold: p.low_stock_threshold || 5,
        allow_backorder: p.allow_backorder ?? false,
        status: p.status || 'active',
        featured: p.featured ?? false,
        tags: p.tags || [],
        meta_title: p.meta_title || '',
        meta_description: p.meta_description || '',
      });
      setImagePreview(p.main_image_url || p.main_image || null);
    } else {
      // Creation mode — inherit category if passed
      const initialCategory =
        product && 'category' in product && !('id' in product)
          ? (product.category as string | null) ?? null
          : null;
      setFormData({
        store: storeId,
        name: '',
        description: '',
        short_description: '',
        sku: `SKU-${Date.now()}`,
        barcode: '',
        price: 0,
        compare_at_price: undefined,
        cost_price: undefined,
        category: initialCategory,
        product_type: null,
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
      });
      setImagePreview(null);
    }
  }, [isOpen, currentId, effectiveProduct, storeId, product]);

  const selectedProductType = useMemo(() => {
    if (!formData.product_type) return null;
    return productTypes.find((pt) => pt.id === formData.product_type) || null;
  }, [formData.product_type, productTypes]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (!original) return;
    let file = original;
    try {
      file = await compressImage(original);
    } catch (error) {
      logger.error('Erro ao comprimir imagem, usando original:', error);
      file = original;
    }
    setFormData((prev) => ({ ...prev, main_image: file }));
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (formData.price <= 0) {
      toast.error('Preço deve ser maior que zero');
      return;
    }

    setSaving(true);
    try {
      const targetProduct = effectiveProduct && 'id' in effectiveProduct ? effectiveProduct as Product : null;
      if (targetProduct) {
        await storesApi.updateProduct(targetProduct.id, formData);
        toast.success('Produto atualizado!');
      } else {
        await storesApi.createProduct(formData);
        toast.success('Produto criado!');
      }
      onSaved();
      onClose();
    } catch (error) {
      const axiosErr = error as { response?: { status?: number; data?: { detail?: string } } };
      const detail = axiosErr?.response?.data?.detail ?? '';
      if (axiosErr?.response?.status === 400 && /limite do plano/i.test(detail)) {
        setPaywall(detail);
        return;
      }
      logger.error('Error saving product:', error);
      toast.error('Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = formData.type_attributes?.[field.name] ?? field.default_value ?? '';

    const updateField = (newValue: unknown) => {
      setFormData((prev) => ({
        ...prev,
        type_attributes: {
          ...prev.type_attributes,
          [field.name]: newValue,
        },
      }));
    };

    switch (field.type) {
      case 'select':
        return (
          <select
            value={String(value)}
            onChange={(e) => updateField(e.target.value)}
            className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
            required={field.required}
          >
            <option value="">Selecione...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'multiselect': {
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateField([...selectedValues, opt.value]);
                    } else {
                      updateField(selectedValues.filter((v: string) => v !== opt.value));
                    }
                  }}
                  className="rounded border-border-token text-brand focus:ring-brand"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => updateField(e.target.checked)}
              className="rounded border-border-token text-brand focus:ring-brand"
            />
            <span className="text-sm">{field.label}</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={Number(value) || ''}
            onChange={(e) => updateField(Number(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={String(value)}
            onChange={(e) => updateField(e.target.value)}
            rows={field.rows || 3}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
            required={field.required}
          />
        );

      case 'color':
        return (
          <input
            type="color"
            value={String(value) || '#000000'}
            onChange={(e) => updateField(e.target.value)}
            className="w-full h-10 rounded-lg cursor-pointer"
          />
        );

      default:
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => updateField(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
            required={field.required}
          />
        );
    }
  };

  const isCurrentlyEditing = !!(effectiveProduct && 'id' in effectiveProduct && effectiveProduct.id);

  const tabs = [
    { id: 'basic', label: 'Básico', icon: CubeIcon },
    { id: 'pricing', label: 'Preços', icon: TagIcon },
    { id: 'inventory', label: 'Estoque', icon: CubeIcon },
    ...(isCurrentlyEditing ? ([{ id: 'variants', label: 'Variantes', icon: Squares2X2Icon }] as const) : []),
    { id: 'media', label: 'Mídia', icon: PhotoIcon },
    { id: 'seo', label: 'SEO', icon: MagnifyingGlassIcon },
  ] as const;

  const modalTitle = isCurrentlyEditing ? 'Editar Produto' : 'Novo Produto';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
      <form onSubmit={handleSubmit}>
        {/* Prev/next navigation */}
        {flatProducts.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              aria-label="produto anterior"
              disabled={idx <= 0}
              onClick={() => goto(-1)}
              className="px-3 py-1 rounded border border-border-token disabled:opacity-40 hover:bg-surface-2 transition-colors text-lg font-bold"
            >
              ‹
            </button>
            {idx >= 0 && (
              <span className="text-xs text-fg-muted-token">
                {idx + 1} / {flatProducts.length}
              </span>
            )}
            <button
              type="button"
              aria-label="próximo produto"
              disabled={idx < 0 || idx >= flatProducts.length - 1}
              onClick={() => goto(1)}
              className="px-3 py-1 rounded border border-border-token disabled:opacity-40 hover:bg-surface-2 transition-colors text-lg font-bold"
            >
              ›
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border-token mb-6 -mx-6 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-fg-muted-token hover:text-fg-token'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1">
          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder="Ex: Rondelli 4 Queijos"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Tipo de Produto
                  </label>
                  <select
                    value={formData.product_type || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        product_type: e.target.value || null,
                        type_attributes: {},
                      }))
                    }
                    className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Sem tipo</option>
                    {productTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.icon} {pt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProductType && selectedProductType.custom_fields.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-fg-token mb-3">
                    Campos de {selectedProductType.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProductType.custom_fields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-fg-token mb-1">
                          {field.label} {field.required && '*'}
                        </label>
                        {renderCustomField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Descrição Curta
                </label>
                <input
                  type="text"
                  value={formData.short_description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder="Breve descrição para listagens"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Descrição Completa
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder="Descrição detalhada do produto..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                    placeholder="Código único"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Código de Barras
                  </label>
                  <input
                    type="text"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                    placeholder="EAN/UPC"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
                    className="rounded border-border-token text-brand focus:ring-brand"
                  />
                  <span className="text-sm">Produto em destaque</span>
                </label>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Preço de Venda *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted-token">R$</span>
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full pl-10 pr-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Preço Comparativo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted-token">R$</span>
                    <input
                      type="number"
                      value={formData.compare_at_price ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          compare_at_price: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="w-full pl-10 pr-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      step="0.01"
                      min="0"
                      placeholder="Preço original"
                    />
                  </div>
                  <p className="text-xs text-fg-muted-token mt-1">Para mostrar desconto</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Custo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted-token">R$</span>
                    <input
                      type="number"
                      value={formData.cost_price ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          cost_price: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="w-full pl-10 pr-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      step="0.01"
                      min="0"
                      placeholder="Custo do produto"
                    />
                  </div>
                  <p className="text-xs text-fg-muted-token mt-1">Para cálculo de margem</p>
                </div>
              </div>

              {formData.price > 0 && formData.cost_price && formData.cost_price > 0 && (
                <Card className="p-4 bg-surface-2">
                  <h4 className="text-sm font-medium text-fg-token mb-2">Análise de Margem</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.price - formData.cost_price)}
                      </p>
                      <p className="text-xs text-fg-muted-token">Lucro Bruto</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {(((formData.price - formData.cost_price) / formData.price) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-fg-muted-token">Margem</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {(((formData.price - formData.cost_price) / formData.cost_price) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-fg-muted-token">Markup</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.track_stock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, track_stock: e.target.checked }))}
                  className="rounded border-border-token text-brand focus:ring-brand"
                />
                <span className="text-sm font-medium">Controlar estoque</span>
              </label>

              {formData.track_stock && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-token mb-1">
                      Quantidade em Estoque
                    </label>
                    <input
                      type="number"
                      value={formData.stock_quantity || 0}
                      onChange={(e) => setFormData((prev) => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-token mb-1">
                      Alerta de Estoque Baixo
                    </label>
                    <input
                      type="number"
                      value={formData.low_stock_threshold || 5}
                      onChange={(e) => setFormData((prev) => ({ ...prev, low_stock_threshold: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      min="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-2">
                      <input
                        type="checkbox"
                        checked={formData.allow_backorder}
                        onChange={(e) => setFormData((prev) => ({ ...prev, allow_backorder: e.target.checked }))}
                        className="rounded border-border-token text-brand focus:ring-brand"
                      />
                      <span className="text-sm">Permitir venda sem estoque</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Status do Produto
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ProductInput['status'] }))}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="out_of_stock">Sem Estoque</option>
                  <option value="discontinued">Descontinuado</option>
                </select>
              </div>
            </div>
          )}

          {/* Variants Tab — only in edit mode */}
          {activeTab === 'variants' && isCurrentlyEditing && effectiveProduct && 'id' in effectiveProduct && (
            <VariantsManager productId={(effectiveProduct as Product).id} basePrice={(effectiveProduct as Product).price} />
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-token mb-2">
                  Imagem Principal
                </label>
                <div className="flex items-start gap-4">
                  <div className="w-40 h-40 bg-surface-2 rounded overflow-hidden flex items-center justify-center border-2 border-dashed border-border-token">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <PhotoIcon className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="product-image"
                    />
                    <label
                      htmlFor="product-image"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border-token rounded cursor-pointer hover:bg-surface-2 transition-colors"
                    >
                      <PhotoIcon className="w-5 h-5" />
                      Escolher Imagem
                    </label>
                    <p className="text-xs text-fg-muted-token mt-2">
                      Recomendado: 800x800px, JPG ou PNG, máx 2MB
                    </p>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData((prev) => ({ ...prev, main_image: null }));
                        }}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-2"
                      >
                        Remover imagem
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  URL da Imagem (alternativo)
                </label>
                <input
                  type="url"
                  value={formData.main_image_url || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, main_image_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Título SEO
                </label>
                <input
                  type="text"
                  value={formData.meta_title || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder={formData.name || 'Título para mecanismos de busca'}
                  maxLength={60}
                />
                <p className="text-xs text-fg-muted-token mt-1">
                  {(formData.meta_title || formData.name || '').length}/60 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Descrição SEO
                </label>
                <textarea
                  value={formData.meta_description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder={formData.short_description || 'Descrição para mecanismos de busca'}
                  maxLength={160}
                />
                <p className="text-xs text-fg-muted-token mt-1">
                  {(formData.meta_description || formData.short_description || '').length}/160 caracteres
                </p>
              </div>

              <Card className="p-4 bg-gray-50 dark:bg-black">
                <h4 className="text-sm font-medium text-fg-token mb-2">Prévia no Google</h4>
                <div className="bg-surface p-3 rounded border border-border-token">
                  <p className="text-blue-600 dark:text-blue-400 text-lg hover:underline cursor-pointer">
                    {formData.meta_title || formData.name || 'Título do Produto'}
                  </p>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    sualoja.com.br › produtos › {formData.sku || 'sku'}
                  </p>
                  <p className="text-fg-muted-token text-sm line-clamp-2">
                    {formData.meta_description || formData.short_description || formData.description || 'Descrição do produto aparecerá aqui...'}
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-token">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Salvando...' : isCurrentlyEditing ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
        </div>
      </form>
      <PaywallModal open={!!paywall} message={paywall ?? ''} onClose={() => setPaywall(null)} />
    </Modal>
  );
};

export default ProductFormModal;
export { ProductFormModal };
