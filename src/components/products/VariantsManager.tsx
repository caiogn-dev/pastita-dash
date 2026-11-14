/**
 * VariantsManager — sabores, tamanhos e opções de um produto.
 *
 * Usado na aba "Variantes" do modal de produto (o editor de combos também lê
 * product.variants). O backend valida a loja via IsStoreOwnerOrStaff.
 *
 * 13/11, medido a 390 e 1366 px: "Ativa" era caixinha nativa azul e pausar um
 * sabor exigia abrir o formulário; ✓ e ✕ minúsculos no lugar de Salvar e
 * Cancelar; preço "R$ 22.90"; e o sabor não tinha preço "de" — o desconto do
 * Camarão (40 → 32) não tinha onde morar no painel.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button } from '../common';
import { Switch } from '../ui/Switch';
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
import { formatCurrency } from '../../utils/formatters';

interface VariantsManagerProps {
  productId: string;
  /** Preço base do produto — sugerido quando a variante não tem preço próprio. */
  basePrice?: number;
  /** Notifica o pai quando a lista muda. */
  onChanged?: (variants: StoreProductVariant[]) => void;
}

interface FormDaVariante {
  name: string;
  sku: string;
  price: string;
  compare_at_price: string;
  stock_quantity: string;
  is_active: boolean;
}

const FORM_VAZIO: FormDaVariante = {
  name: '', sku: '', price: '', compare_at_price: '', stock_quantity: '0', is_active: true,
};

const numeroOuNulo = (texto: string) => (texto === '' ? null : Number(texto));

const paraEnvio = (f: FormDaVariante): StoreProductVariantInput => ({
  name: f.name.trim(),
  sku: f.sku.trim() || undefined,
  price: numeroOuNulo(f.price),
  compare_at_price: numeroOuNulo(f.compare_at_price),
  stock_quantity: Number(f.stock_quantity) || 0,
  is_active: f.is_active,
});

/** Preço pago e, se houver, o "de" e o % — a mesma conta do cardápio. */
const precoDaVariante = (v: StoreProductVariant) => {
  const preco = Number(v.effective_price ?? v.price ?? 0);
  const cheio = Number(v.compare_at_price);
  const emPromocao = Number.isFinite(cheio) && cheio > preco;
  const pct = emPromocao ? Math.round((1 - preco / cheio) * 100) : 0;
  return { preco, cheio: emPromocao ? cheio : null, pct };
};

const CAMPO = 'h-10 w-full rounded-md border border-border-token bg-surface px-3 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand';
const ROTULO = 'mb-1 block text-xs font-medium text-fg-muted-token';

export const VariantsManager: React.FC<VariantsManagerProps> = ({ productId, basePrice, onChanged }) => {
  const [variants, setVariants] = useState<StoreProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormDaVariante>(FORM_VAZIO);
  const [alternando, setAlternando] = useState<string | null>(null);
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
    // onChanged fora das deps: o callback do pai pode mudar a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => { setForm(FORM_VAZIO); setEditingId('new'); };

  const startEdit = (v: StoreProductVariant) => {
    setForm({
      name: v.name,
      sku: v.sku || '',
      price: v.price != null ? String(v.price) : '',
      compare_at_price: v.compare_at_price != null ? String(v.compare_at_price) : '',
      stock_quantity: String(v.stock_quantity ?? 0),
      is_active: v.is_active,
    });
    setEditingId(v.id);
  };

  const cancelEdit = () => { setEditingId(null); setForm(FORM_VAZIO); };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Dê um nome à variante');
      return;
    }
    const preco = numeroOuNulo(form.price) ?? basePrice ?? 0;
    const cheio = numeroOuNulo(form.compare_at_price);
    if (cheio != null && cheio <= preco) {
      toast.error('O preço "antes" precisa ser maior que o preço');
      return;
    }
    setSaving(true);
    try {
      if (editingId === 'new') {
        await createProductVariant(productId, paraEnvio(form));
        toast.success('Variante criada');
      } else if (editingId) {
        await updateProductVariant(productId, editingId, paraEnvio(form));
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

  // Vender/pausar direto na linha: muda na hora, volta se a API recusar.
  const alternar = async (v: StoreProductVariant, ligado: boolean) => {
    setAlternando(v.id);
    setVariants((lista) => lista.map((x) => (x.id === v.id ? { ...x, is_active: ligado } : x)));
    try {
      await updateProductVariant(productId, v.id, { is_active: ligado });
      toast.success(ligado ? `${v.name} voltou ao cardápio` : `${v.name} pausado`);
    } catch (err) {
      logger.error('Erro ao alternar variante:', err);
      setVariants((lista) => lista.map((x) => (x.id === v.id ? { ...x, is_active: !ligado } : x)));
      toast.error('Não foi possível salvar. Nada mudou no cardápio.');
    } finally {
      setAlternando(null);
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

  const campo = (id: keyof FormDaVariante) => `variante-${String(editingId)}-${id}`;

  const renderForm = () => (
    <div className="space-y-3 rounded-lg border border-brand bg-brand-soft p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2">
          <label htmlFor={campo('name')} className={ROTULO}>Nome</label>
          <input
            id={campo('name')}
            type="text"
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Frango, Grande…"
            className={CAMPO}
          />
        </div>
        <div>
          <label htmlFor={campo('price')} className={ROTULO}>Preço</label>
          <input
            id={campo('price')}
            type="number" inputMode="decimal" min="0" step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder={basePrice != null ? formatCurrency(basePrice) : ''}
            className={`${CAMPO} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor={campo('compare_at_price')} className={ROTULO}>Preço antes (riscado)</label>
          <input
            id={campo('compare_at_price')}
            type="number" inputMode="decimal" min="0" step="0.01"
            value={form.compare_at_price}
            onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))}
            placeholder="Sem desconto"
            className={`${CAMPO} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor={campo('stock_quantity')} className={ROTULO}>Estoque</label>
          <input
            id={campo('stock_quantity')}
            type="number" inputMode="numeric" min="0"
            value={form.stock_quantity}
            onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
            className={`${CAMPO} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor={campo('sku')} className={ROTULO}>SKU</label>
          <input
            id={campo('sku')}
            type="text"
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            className={CAMPO}
          />
        </div>
        <div className="col-span-2 flex items-end">
          <div className="flex h-10 items-center gap-3">
            <Switch
              ligado={form.is_active}
              onMudar={(is_active) => setForm((f) => ({ ...f, is_active }))}
              rotulo="Vender esta variante"
            />
            <span className="text-sm text-fg-token">{form.is_active ? 'No cardápio' : 'Pausada'}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>Cancelar</Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return <p className="py-4 text-sm text-fg-muted-token">Carregando variantes…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="min-w-0 truncate text-sm font-semibold text-fg-token">
          Variantes <span className="font-normal text-fg-muted-token">({variants.length})</span>
        </h4>
        {editingId === null && (
          <Button type="button" size="sm" onClick={startCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
            Nova variante
          </Button>
        )}
      </div>

      {editingId === 'new' && renderForm()}

      {variants.length === 0 && editingId !== 'new' && (
        <p className="rounded-lg border border-dashed border-border-token py-3 text-center text-sm text-fg-muted-token">
          Nenhuma variante cadastrada.
        </p>
      )}

      <ul className="space-y-2">
        {variants.map((v) => {
          const { preco, cheio, pct } = precoDaVariante(v);
          return (
            <li key={v.id}>
              {editingId === v.id ? renderForm() : (
                <div className={`flex items-center gap-3 rounded-lg border border-border-token p-3 ${v.is_active ? '' : 'opacity-60'}`}>
                  <Switch
                    ligado={v.is_active}
                    desabilitado={alternando === v.id}
                    onMudar={(ligado) => alternar(v, ligado)}
                    rotulo={`Vender ${v.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg-token">{v.name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted-token">
                      {/* O % mora embaixo do nome: ao lado do preço ele
                          espremia "Camarão" em "Ca…" a 390 px. */}
                      {pct > 0 && (
                        <span className="rounded-pill bg-[var(--success-soft)] px-1.5 font-bold text-[var(--success)]">
                          −{pct}%
                        </span>
                      )}
                      {!v.is_active && <span>Pausada</span>}
                      {v.sku && <span>{v.sku}</span>}
                      {Number(v.stock_quantity) > 0 && <span className="whitespace-nowrap">{v.stock_quantity} em estoque</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-semibold tabular-nums text-fg-token">{formatCurrency(preco)}</span>
                    {cheio != null && (
                      <span className="text-xs tabular-nums text-fg-muted-token line-through">{formatCurrency(cheio)}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => startEdit(v)}
                      className="rounded-md p-2 text-fg-muted-token hover:bg-surface-2 hover:text-brand-ink"
                      title="Editar"
                      aria-label={`Editar variante ${v.name}`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v)}
                      className="rounded-md p-2 text-fg-muted-token hover:bg-surface-2 hover:text-[var(--danger)]"
                      title="Excluir"
                      aria-label={`Excluir variante ${v.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {ConfirmDialog}
    </div>
  );
};

export default VariantsManager;
