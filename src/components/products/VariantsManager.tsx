/**
 * VariantsManager — CRUD de variantes de um produto (sabores, tamanhos etc.).
 *
 * Usado na aba "Variantes" do modal de produto. Variantes são pré-requisito
 * para montar combos (ComboForm usa product.variants para os limites).
 * Multi-tenant: o backend valida acesso à loja via IsStoreOwnerOrStaff.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button } from '../common';
import {
  StoreProductVariant,
  StoreProductVariantInput,
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from '../../services/storesApi';
import logger from '../../services/logger';
import { useConfirm } from '../../hooks/useConfirm';

interface VariantsManagerProps {
  productId: string;
  /** Preço base do produto — usado como placeholder quando a variante não tem preço próprio */
  basePrice?: number;
  /** Notifica o pai quando a lista muda (para refletir no produto carregado) */
  onChanged?: (variants: StoreProductVariant[]) => void;
}

interface VariantFormState {
  name: string;
  sku: string;
  price: string;
  stock_quantity: string;
  is_active: boolean;
}

const EMPTY_FORM: VariantFormState = {
  name: '',
  sku: '',
  price: '',
  stock_quantity: '0',
  is_active: true,
};

const toPayload = (form: VariantFormState): StoreProductVariantInput => ({
  name: form.name.trim(),
  sku: form.sku.trim() || undefined,
  price: form.price === '' ? null : Number(form.price),
  stock_quantity: Number(form.stock_quantity) || 0,
  is_active: form.is_active,
});

export const VariantsManager: React.FC<VariantsManagerProps> = ({ productId, basePrice, onChanged }) => {
  const [variants, setVariants] = useState<StoreProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<VariantFormState>(EMPTY_FORM);
  const [ConfirmDialog, confirmAction] = useConfirm();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProductVariants(productId);
      setVariants(data);
      onChanged?.(data);
    } catch (err) {
      logger.error('Erro ao carregar variantes:', err);
      toast.error('Erro ao carregar variantes');
    } finally {
      setLoading(false);
    }
    // onChanged intencionalmente fora das deps — callback do pai pode mudar a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId('new');
  };

  const startEdit = (v: StoreProductVariant) => {
    setForm({
      name: v.name,
      sku: v.sku || '',
      price: v.price != null ? String(v.price) : '',
      stock_quantity: String(v.stock_quantity ?? 0),
      is_active: v.is_active,
    });
    setEditingId(v.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome da variante é obrigatório');
      return;
    }
    setSaving(true);
    try {
      if (editingId === 'new') {
        await createProductVariant(productId, toPayload(form));
        toast.success('Variante criada');
      } else if (editingId) {
        await updateProductVariant(productId, editingId, toPayload(form));
        toast.success('Variante atualizada');
      }
      cancelEdit();
      await load();
    } catch (err) {
      logger.error('Erro ao salvar variante:', err);
      toast.error('Erro ao salvar variante');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (variant: StoreProductVariant) => {
    const confirmed = await confirmAction({
      title: 'Excluir variante',
      message: `Excluir a variante "${variant.name}"?`,
      confirmText: 'Excluir',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteProductVariant(productId, variant.id);
      toast.success('Variante excluída');
      await load();
    } catch (err) {
      logger.error('Erro ao excluir variante:', err);
      toast.error('Erro ao excluir variante');
    }
  };

  const renderForm = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end p-3 rounded-lg border border-brand bg-brand-soft">
      <div className="col-span-2 md:col-span-1">
        <label className="block text-xs font-medium text-fg-muted-token mb-1">Nome *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ex.: Frango, Grande…"
          className="w-full px-2 py-1.5 text-sm rounded-md border border-border-token bg-surface text-fg-token"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-fg-muted-token mb-1">SKU</label>
        <input
          type="text"
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          className="w-full px-2 py-1.5 text-sm rounded-md border border-border-token bg-surface text-fg-token"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-fg-muted-token mb-1">Preço (R$)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          placeholder={basePrice != null ? `${basePrice} (herdado)` : 'herda do produto'}
          className="w-full px-2 py-1.5 text-sm rounded-md border border-border-token bg-surface text-fg-token"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-fg-muted-token mb-1">Estoque</label>
        <input
          type="number"
          min="0"
          value={form.stock_quantity}
          onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
          className="w-full px-2 py-1.5 text-sm rounded-md border border-border-token bg-surface text-fg-token"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-fg-token cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="rounded"
          />
          Ativa
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="p-1.5 rounded-md bg-brand text-on-brand hover:bg-brand disabled:opacity-50"
          title="Salvar variante"
        >
          <CheckIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="p-1.5 rounded-md bg-surface-2 text-fg-token hover:bg-surface"
          title="Cancelar"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return <p className="text-sm text-fg-muted-token py-4">Carregando variantes…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-fg-token">Variantes do produto</h4>
          <p className="text-xs text-fg-muted-token">
            Sabores, tamanhos, opções… Variantes são necessárias para montar combos.
          </p>
        </div>
        {editingId === null && (
          <Button type="button" size="sm" onClick={startCreate}>
            <PlusIcon className="w-4 h-4 mr-1" />
            Nova variante
          </Button>
        )}
      </div>

      {editingId === 'new' && renderForm()}

      {variants.length === 0 && editingId !== 'new' && (
        <p className="text-sm text-fg-muted-token py-3 text-center border border-dashed border-border-token rounded-lg">
          Nenhuma variante cadastrada.
        </p>
      )}

      <ul className="space-y-2">
        {variants.map((v) => (
          <li key={v.id}>
            {editingId === v.id ? (
              renderForm()
            ) : (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border-token">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg-token truncate">
                    {v.name}
                    {!v.is_active && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-surface-2 text-fg-muted-token">inativa</span>
                    )}
                  </p>
                  <p className="text-xs text-fg-muted-token">
                    {v.sku ? `${v.sku} ·` : ''}R$ {Number(v.effective_price).toFixed(2)} · estoque {v.stock_quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(v)}
                    className="p-1.5 rounded-md text-fg-muted-token hover:text-brand-ink hover:bg-surface-2"
                    title="Editar"
                    aria-label={`Editar variante ${v.name}`}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(v)}
                    className="p-1.5 rounded-md text-fg-muted-token hover:text-red-600 hover:bg-surface-2"
                    title="Excluir"
                    aria-label={`Excluir variante ${v.name}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {ConfirmDialog}
    </div>
  );
};

export default VariantsManager;
