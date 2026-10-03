/**
 * ComboFormPage — Dedicated page for creating/editing combos
 *
 * Routes:
 * - /stores/{store_slug}/combos/new
 * - /stores/{store_slug}/combos/{combo_id}/edit
 *
 * Usa o ComboEditor (tela única com prévia) e envia a foto depois de salvar.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, PageShell } from '../../../components/ui';
import { Loading } from '../../../components/common';
import { ComboEditor } from '../../../components/Combos/editor/ComboEditor';
import { useStore } from '../../../hooks';
import storesApi, {
  StoreCombo,
  StoreComboPayload,
  StoreProduct as Product,
  getCombo,
  createComboWithItems,
  updateComboWithItems,
  uploadComboImage,
} from '../../../services/storesApi';
import logger from '../../../services/logger';

export const ComboFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId, comboId } = useParams<{ storeId?: string; comboId?: string }>();
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

  const [combo, setCombo] = useState<StoreCombo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditing = !!comboId;
  // "Duplicar" na lista abre /combos/new?de=<id>: o combo de origem vira o
  // ponto de partida de um combo NOVO.
  const [params] = useSearchParams();
  const origemId = !comboId ? params.get('de') : null;

  const loadData = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [productsRes, comboRes] = await Promise.all([
        storesApi.getProducts({ store: storeId, status: 'active', page_size: 200 }),
        comboId ? getCombo(comboId) : origemId ? getCombo(origemId) : Promise.resolve(null),
      ]);

      setProducts(productsRes.results || []);
      setCombo(comboRes ? (origemId ? { ...comboRes, name: `${comboRes.name} (cópia)` } : comboRes) : null);
    } catch (err) {
      logger.error('Error loading data:', err);
      toast.error('Erro ao carregar dados');
      navigate(`/stores/${storeSlug || storeId}/combos`);
    } finally {
      setLoading(false);
    }
  }, [storeId, storeSlug, comboId, origemId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (data: StoreComboPayload, foto?: File) => {
    setSaving(true);
    try {
      const salvo = isEditing && comboId
        ? await updateComboWithItems(comboId, data)
        : await createComboWithItems(data);
      // A foto vai depois, num segundo pedido: o combo precisa existir para
      // receber o arquivo, e o JSON dos grupos não carrega arquivo.
      if (foto && salvo?.id) {
        try {
          await uploadComboImage(salvo.id, foto);
        } catch (err) {
          logger.error('Error uploading combo image:', err);
          toast.error('Combo salvo, mas a foto não subiu');
        }
      }
      toast.success(isEditing ? 'Combo salvo' : 'Combo criado');
      navigate(`/stores/${storeSlug || storeId}/combos`);
    } catch (err) {
      logger.error('Error saving combo:', err);
      toast.error('Não foi possível salvar o combo');
    } finally {
      setSaving(false);
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
        <h2 className="text-xl font-semibold text-fg-token mb-2">Nenhuma loja selecionada</h2>
        <p className="text-fg-muted-token mb-4">Selecione uma loja para gerenciar combos.</p>
        <Button onClick={() => navigate('/stores')}>Ver Lojas</Button>
      </div>
    );
  }

  if (loading) return <Loading />;

  if (isEditing && !combo) {
    return (
      <div className="p-6 text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-[var(--danger)] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-fg-token mb-2">Combo não encontrado</h2>
        <p className="text-fg-muted-token mb-4">O combo solicitado não existe.</p>
        <Button onClick={() => navigate(`/stores/${storeId}/combos`)}>Voltar</Button>
      </div>
    );
  }

  return (
    <PageShell
      trilha={[
        { rotulo: 'Cardápio' },
        { rotulo: 'Combos', href: `/stores/${storeSlug}/combos` },
        { rotulo: isEditing ? 'Editar' : 'Novo combo' },
      ]}
      titulo={isEditing ? combo?.name || 'Combo' : 'Novo combo'}
      acoes={
        <Button variant="outline" onClick={() => navigate(-1)} leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
          Voltar
        </Button>
      }
    >
      <ComboEditor
        combo={combo}
        storeId={storeId}
        produtos={products}
        salvando={saving}
        editando={isEditing}
        onSalvar={handleSubmit}
        onCancelar={() => navigate(`/stores/${storeSlug || storeId}/combos`)}
      />
    </PageShell>
  );
};

export default ComboFormPage;
