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
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, PageShell } from '../../../components/ui';
import { Modal, Loading } from '../../../components/common';
import ComboList from '../../../components/Combos/ComboList';
import { useStore } from '../../../hooks';
import storesApi, {
  StoreCombo,
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
    // A loja da URL manda. Antes, sem achar a loja na conta, a página caía na
    // loja do topo e mostrava os combos dela sob a URL de outra: abrir
    // /stores/agriao…/combos listava os combos da Cê (03/10).
    const match = stores.find(s => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || null;
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


  if (routeStoreId && !storeId) {
    if (stores.length === 0) return <Loading />;
    return (
      <div className="p-6 text-center">
        <h2 className="mb-2 text-xl font-semibold text-fg-token">Loja não encontrada nesta conta</h2>
        <Button onClick={() => navigate('/stores')}>Ver lojas</Button>
      </div>
    );
  }

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
    <PageShell
      titulo="Combos"
      acoes={
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            leftIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => navigate(`/stores/${storeSlug}/combos/new`)}
          >
            Novo combo
          </Button>
        </div>
      }
    >

      <ComboList
        combos={combos}
        loading={loading}
        onEdit={combo => navigate(`/stores/${storeSlug}/combos/${combo.id}/edit`)}
        onDuplicate={combo => navigate(`/stores/${storeSlug}/combos/new?de=${combo.id}`)}
        onDelete={setDeletingCombo}
        onToggleActive={handleToggleActive}
        onToggleFeatured={handleToggleFeatured}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deletingCombo}
        onClose={() => setDeletingCombo(null)}
        title="Excluir combo"
      >
        <div className="space-y-4">
          <p className="text-fg-token">
            Excluir <strong>{deletingCombo?.name}</strong>? Não dá para desfazer.
          </p>
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
    </PageShell>
  );
};

export default ComboListPage;
