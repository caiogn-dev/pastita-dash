/**
 * ComboListPage — List/table view of combos
 *
 * Shows combos in a table format with filtering and actions
 * Accessible at: /stores/{store_slug}/combos
 *
 * Features:
 * - Table with: Name, Price, # Groups (items), Status, Actions
 * - Filter by active/inactive status
 * - Search by name/description
 * - Edit/Duplicate/Delete actions
 * - New Combo button for creating combos
 * - Stats cards showing total, active, featured, and items with products
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Modal, Loading } from '../../../components/common';
import ComboList from '../../../components/Combos/ComboList';
import { useStore } from '../../../hooks';
import storesApi, {
  StoreCombo,
  StoreProduct as Product,
  getCombos,
  deleteCombo,
} from '../../../services/storesApi';
import logger from '../../../services/logger';

export const ComboListPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, storeName, stores } = useStore();

  const storeId = useMemo(() => {
    if (!routeStoreId) return contextStoreId || null;
    // Support both store ID and store slug in the route
    const match = stores.find(s => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || contextStoreId || null;
  }, [routeStoreId, contextStoreId, stores]);

  // Get store slug for navigation
  const storeSlug = useMemo(() => {
    const match = stores.find(s => s.id === storeId);
    return match?.slug || routeStoreId || '';
  }, [storeId, routeStoreId, stores]);

  const [combos, setCombos] = useState<StoreCombo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingCombo, setDeletingCombo] = useState<StoreCombo | null>(null);

  const loadData = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!deletingCombo) return;
    try {
      await deleteCombo(deletingCombo.id);
      toast.success('Combo excluído com sucesso');
      setDeletingCombo(null);
      loadData();
    } catch (err) {
      logger.error('Error deleting combo:', err);
      toast.error('Erro ao excluir combo');
    }
  };

  const handleToggleActive = async (combo: StoreCombo) => {
    try {
      await storesApi.updateCombo(combo.id, { is_active: !combo.is_active });
      setCombos(prev =>
        prev.map(c => (c.id === combo.id ? { ...c, is_active: !c.is_active } : c))
      );
    } catch (err) {
      logger.error('Error toggling combo status:', err);
      toast.error('Erro ao atualizar combo');
    }
  };

  const handleToggleFeatured = async (combo: StoreCombo) => {
    try {
      await storesApi.updateCombo(combo.id, { featured: !combo.featured });
      setCombos(prev =>
        prev.map(c => (c.id === combo.id ? { ...c, featured: !c.featured } : c))
      );
    } catch (err) {
      logger.error('Error toggling featured:', err);
      toast.error('Erro ao atualizar combo');
    }
  };


  if (!storeId) {
    return (
      <div className="p-6 text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Nenhuma loja selecionada
        </h2>
        <p className="text-gray-500 dark:text-zinc-400 mb-4">
          Selecione uma loja para gerenciar combos.
        </p>
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
          <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
            {storeName ? `Combos de ${storeName}` : 'Gerencie combos e kits de produtos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadData} title="Atualizar">
            <ArrowPathIcon className="w-5 h-5" />
          </Button>
          <Button onClick={() => navigate(`/stores/${storeSlug}/combos/new`)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Novo Combo
          </Button>
        </div>
      </div>

      {/* Stats */}
      {combos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: combos.length, color: 'text-gray-900 dark:text-white' },
            {
              label: 'Ativos',
              value: combos.filter(c => c.is_active).length,
              color: 'text-green-600 dark:text-green-400',
            },
            {
              label: 'Destaques',
              value: combos.filter(c => c.featured).length,
              color: 'text-yellow-600 dark:text-yellow-400',
            },
            {
              label: 'Com produtos',
              value: combos.filter(c => c.items.length > 0).length,
              color: 'text-blue-600 dark:text-blue-400',
            },
          ].map(s => (
            <Card key={s.label} className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mt-0.5">
                {s.label}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* List */}
      <Card className="p-6">
        <ComboList
          combos={combos}
          products={products}
          loading={loading}
          onEdit={combo => navigate(`/stores/${storeSlug}/combos/${combo.id}/edit`)}
          onDelete={setDeletingCombo}
          onToggleActive={handleToggleActive}
          onToggleFeatured={handleToggleFeatured}
        />
      </Card>

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
            <Button variant="secondary" onClick={() => setDeletingCombo(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ComboListPage;
