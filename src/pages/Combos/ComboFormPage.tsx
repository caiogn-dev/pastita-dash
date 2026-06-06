/**
 * ComboFormPage — Dedicated page for creating/editing combos
 *
 * Routes:
 * - /stores/{store_slug}/combos/new
 * - /stores/{store_slug}/combos/{combo_id}/edit
 *
 * Integrates ComboForm component and handles API calls
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Loading } from '../../components/common';
import ComboForm from '../../components/Combos/ComboForm';
import { useStore } from '../../hooks';
import storesApi, {
  StoreCombo,
  StoreComboInput,
  StoreComboItemInput,
  StoreProduct as Product,
  getCombo,
  createComboWithItems,
  updateComboWithItems,
} from '../../services/storesApi';
import logger from '../../services/logger';

type ComboItemDraft = StoreComboItemInput & {
  _key: string;
  product_name?: string;
  product_price?: number;
};

export const ComboFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId, comboId } = useParams<{ storeId?: string; comboId?: string }>();
  const { storeId: contextStoreId, storeName, stores } = useStore();

  const storeId = useMemo(() => {
    if (!routeStoreId) return contextStoreId || null;
    const match = stores.find(s => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || contextStoreId || null;
  }, [routeStoreId, contextStoreId, stores]);

  const [combo, setCombo] = useState<StoreCombo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditing = !!comboId;

  const loadData = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [productsRes, comboRes] = await Promise.all([
        storesApi.getProducts({ store: storeId, status: 'active', page_size: 200 }),
        comboId ? getCombo(comboId) : Promise.resolve(null),
      ]);

      setProducts(productsRes.results || []);
      setCombo(comboRes || null);
    } catch (err) {
      logger.error('Error loading data:', err);
      toast.error('Erro ao carregar dados');
      navigate(`/stores/${storeId || ''}/combos`);
    } finally {
      setLoading(false);
    }
  }, [storeId, comboId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (data: StoreComboInput & { items?: ComboItemDraft[] }) => {
    setSaving(true);
    try {
      if (isEditing && comboId) {
        await updateComboWithItems(comboId, data);
        toast.success('Combo atualizado com sucesso!');
      } else {
        await createComboWithItems(data);
        toast.success('Combo criado com sucesso!');
      }
      navigate(`/stores/${storeId || ''}/combos`);
    } catch (err) {
      logger.error('Error saving combo:', err);
      toast.error('Erro ao salvar combo');
    } finally {
      setSaving(false);
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

  if (loading) return <Loading />;

  if (isEditing && !combo) {
    return (
      <div className="p-6 text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Combo não encontrado</h2>
        <p className="text-gray-500 dark:text-zinc-400 mb-4">O combo solicitado não existe.</p>
        <Button onClick={() => navigate(`/stores/${storeId}/combos`)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors"
          title="Voltar"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? `Editar Combo — ${combo?.name}` : 'Novo Combo'}
          </h1>
          <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
            {storeName ? `Loja: ${storeName}` : 'Configure um novo combo para sua loja'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        <ComboForm
          combo={combo}
          storeId={storeId}
          products={products}
          onSubmit={handleSubmit}
          isLoading={saving}
        />
      </Card>
    </div>
  );
};

export default ComboFormPage;
