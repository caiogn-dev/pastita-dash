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
import { PlusIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, StatCard } from '../../../components/ui';
import { Modal, Loading } from '../../../components/common';
import ComboList from '../../../components/Combos/ComboList';
import { useStore } from '../../../hooks';
import storesApi, { StoreCombo, getCombos, deleteCombo } from '../../../services/storesApi';
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
  const [loading, setLoading] = useState(true);
  const [deletingCombo, setDeletingCombo] = useState<StoreCombo | null>(null);

  const loadData = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Antes buscava 200 produtos só p/ passar pro <ComboList products={...}>,
      // mas ComboList nunca usa essa prop (o editor é que carrega produtos).
      const combosRes = await getCombos(storeId);
      setCombos(combosRes.results || []);
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
        <h2 className="text-xl font-semibold text-fg-token mb-2">
          Nenhuma loja selecionada
        </h2>
        <p className="text-fg-muted-token mb-4">
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
          <h1 className="text-2xl font-bold text-fg-token">Combos</h1>
          <p className="text-fg-muted-token">
            {storeName ? `Combos de ${storeName}` : 'Gerencie combos e kits de produtos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} title="Atualizar">
            <ArrowPathIcon className="w-5 h-5" />
          </Button>
          <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />} onClick={() => navigate(`/stores/${storeSlug}/combos/new`)}>
            Novo Combo
          </Button>
        </div>
      </div>

      {/* Stats */}
      {combos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: 'Total', value: combos.length, tone: 'default' as const },
            {
              label: 'Ativos',
              value: combos.filter(c => c.is_active).length,
              tone: 'brand' as const,
            },
            {
              label: 'Destaques',
              value: combos.filter(c => c.featured).length,
              tone: 'warning' as const,
            },
            {
              label: 'Com produtos',
              value: combos.filter(c => (c.groups?.length ?? 0) > 0).length,
              tone: 'brand' as const,
            },
          ]).map(s => (
            <StatCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      )}

      {/* List */}
      <Card className="p-6">
        <ComboList
          combos={combos}
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
          <p className="text-fg-muted-token">
            Tem certeza que deseja excluir o combo <strong>{deletingCombo?.name}</strong>?
          </p>
          <p className="text-sm text-[var(--danger)]">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingCombo(null)}>
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
