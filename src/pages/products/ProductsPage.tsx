import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import logger from '../../services/logger';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Input, Badge, Modal, Loading, Textarea } from '../../components/common';
import { productsService, Product, CreateProduct } from '../../services/products';
import { useStore } from '../../hooks';

const LOW_STOCK_THRESHOLD = 5;

const formatMoney = (value?: number | string | null) => {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  if (Number.isNaN(numeric)) return '0.00';
  return numeric.toFixed(2);
};

const escapeCsvValue = (value: string | number | boolean | null | undefined) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const parseCsv = (content: string) => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ['Arquivo CSV sem dados.'] };
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((header) => header.trim().toLowerCase());
  const rows: CreateProduct[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const values = line.split(delimiter).map((value) => value.trim());
    const data: Record<string, string> = {};
    headers.forEach((header, colIndex) => {
      data[header] = values[colIndex] || '';
    });

    const name = data.name || '';
    const sku = data.sku || '';
    if (!name || !sku) {
      errors.push(`Linha ${index + 2}: nome e SKU s?o obrigat?rios.`);
      return;
    }

    rows.push({
      name,
      sku,
      description: data.description || '',
      category: data.category || '',
      price: Number.parseFloat(data.price || '0') || 0,
      stock_quantity: Number.parseInt(data.stock_quantity || '0', 10) || 0,
      is_active: data.is_active ? data.is_active.toLowerCase() !== 'false' : true,
    });
  });

  return { rows, errors };
};

export const ProductsPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, storeName, isStoreSelected } = useStore();
  
  // Use route storeId if available, otherwise use context
  const storeId = routeStoreId || contextStoreId;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [formData, setFormData] = useState<CreateProduct>({
    name: '',
    sku: '',
    description: '',
    category: '',
    price: 0,
    stock_quantity: 0,
    is_active: true,
    image: null,
    store: storeId || undefined,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [productsData, categoriesData] = await Promise.all([
        productsService.getProducts({
          store: storeId,
          search: search || undefined,
          category: filterCategory || undefined,
          is_active: filterActive,
        }),
        productsService.getCategories(),
      ]);
      setProducts(productsData.results);
      setCategories(categoriesData);
    } catch (err) {
      logger.error('Error loading products:', err);
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [search, filterActive, filterCategory, storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update form data when store changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, store: storeId || undefined }));
  }, [storeId]);

  const filteredProducts = useMemo(() => {
    if (stockFilter === 'all') return products;
    return products.filter((product) => {
      const qty = product.stock_quantity || 0;
      if (stockFilter === 'out_of_stock') return qty <= 0;
      if (stockFilter === 'low_stock') return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
      return qty > 0;
    });
  }, [products, stockFilter]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        category: product.category || '',
        price: product.price,
        stock_quantity: product.stock_quantity,
        is_active: product.is_active,
        image: null,
      });
      setImagePreview(product.image_url || product.image || null);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        description: '',
        category: '',
        price: 0,
        stock_quantity: 0,
        is_active: true,
        image: null,
      });
      setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
    setImagePreview(null);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, image: file }));
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!storeId) {
      setError('Selecione uma loja antes de criar um produto');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const payload: CreateProduct = {
        ...formData,
        store: storeId,
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description?.trim() || '',
        category: formData.category?.trim() || '',
        price: Number(formData.price) || 0,
        stock_quantity: Number(formData.stock_quantity) || 0,
        is_active: Boolean(formData.is_active),
        image: formData.image || null,
      };

      if (editingProduct) {
        await productsService.updateProduct(editingProduct.id, payload);
      } else {
        await productsService.createProduct(payload);
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      logger.error('Error saving product:', err);
      setError('Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await productsService.updateProduct(product.id, { is_active: !product.is_active });
      loadData();
    } catch (error) {
      logger.error('Error toggling product status:', error);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      setSaving(true);
      await productsService.deleteProduct(deletingProduct.id);
      setIsDeleteModalOpen(false);
      setDeletingProduct(null);
      loadData();
    } catch (error) {
      logger.error('Error deleting product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['name', 'sku', 'price', 'stock_quantity', 'category', 'description', 'is_active'];
    const rows = filteredProducts.map((product) => ([
      escapeCsvValue(product.name),
      escapeCsvValue(product.sku),
      escapeCsvValue(product.price),
      escapeCsvValue(product.stock_quantity),
      escapeCsvValue(product.category || ''),
      escapeCsvValue(product.description || ''),
      escapeCsvValue(product.is_active ? 'true' : 'false'),
    ].join(',')));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'produtos.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const content = await file.text();
      const { rows, errors } = parseCsv(content);
      if (errors.length) {
        alert(errors.join('\n'));
      }
      for (const row of rows) {
        await productsService.createProduct(row);
      }
      loadData();
    } catch (error) {
      logger.error('Error importing products:', error);
    } finally {
      setImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  if (loading && products.length === 0) {
    return <Loading />;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Produtos</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Gerencie o catálogo da loja</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCsv}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="flex-1 sm:flex-none"
          >
            <ArrowUpTrayIcon className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{importing ? 'Importando...' : 'Importar'}</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportCsv} className="flex-1 sm:flex-none">
            <ArrowDownTrayIcon className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button size="sm" onClick={() => handleOpenModal()} className="flex-1 sm:flex-none">
            <PlusIcon className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Produto</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nome, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2 sm:gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="">Categoria</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={filterActive === undefined ? '' : String(filterActive)}
              onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="">Status</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
              className="px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="all">Estoque</option>
              <option value="in_stock">Disponível</option>
              <option value="low_stock">Baixo</option>
              <option value="out_of_stock">Sem</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-gray-200">
          {filteredProducts.map((product) => {
            const qty = product.stock_quantity || 0;
            const isLow = qty > 0 && qty <= LOW_STOCK_THRESHOLD;
            const isOut = qty <= 0;
            return (
              <div key={product.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                    {product.image_url || product.image ? (
                      <img
                        src={product.image_url || product.image || ''}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>
                        {product.category && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleActive(product)}
                        className="focus:outline-none shrink-0"
                      >
                        <Badge variant={product.is_active ? 'success' : 'danger'}>
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      R$ {formatMoney(product.price)}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{qty} un</span>
                      {isOut && <Badge variant="danger">Sem</Badge>}
                      {isLow && <Badge variant="warning">Baixo</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingProduct(product);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 rounded-lg"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const qty = product.stock_quantity || 0;
                const isLow = qty > 0 && qty <= LOW_STOCK_THRESHOLD;
                const isOut = qty <= 0;
                return (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {product.image_url || product.image ? (
                            <img
                              src={product.image_url || product.image || ''}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <PhotoIcon className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{product.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">SKU: {product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {product.category || '-'}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      R$ {formatMoney(product.price)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>{qty}</span>
                        {isOut && <Badge variant="danger">Sem estoque</Badge>}
                        {isLow && <Badge variant="warning">Baixo</Badge>}
                        {!isOut && !isLow && <Badge variant="success">OK</Badge>}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className="focus:outline-none"
                      >
                        <Badge variant={product.is_active ? 'success' : 'danger'}>
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingProduct(product);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 px-4">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum produto encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Cadastre novos produtos para aparecerem aqui.
            </p>
            <div className="mt-6">
              <Button onClick={() => handleOpenModal()}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Novo Produto
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do produto"
            />
            <Input
              label="SKU *"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="SKU"
            />
          </div>

          <Textarea
            label="Descri??o"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Descri??o do produto"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Categoria"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Ex: Massas"
            />
            <Input
              label="Pre?o (R$) *"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
            />
            <Input
              label="Estoque *"
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value, 10) || 0 })}
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Imagem
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <PhotoIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Enviar imagem
              </Button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={Boolean(formData.is_active)}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Produto ativo
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.sku}
            >
              {saving ? 'Salvando...' : editingProduct ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingProduct(null);
        }}
        title="Excluir Produto"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir o produto <strong>{deletingProduct?.name}</strong>?
            Esta a??o n?o pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingProduct(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
