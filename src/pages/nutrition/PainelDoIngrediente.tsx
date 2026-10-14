/**
 * Edição do ingrediente AO LADO da lista (molde lista + painel, 14/10).
 * Antes era uma janela por cima: para conferir o ingrediente de cima era
 * fechar, achar e abrir de novo — e a janela escondia a tabela que dava o
 * contexto (fonte, alergênicos dos vizinhos).
 *
 * Alimento oficial (TACO/POF) abre em LEITURA e o botão diz o que acontece:
 * adotar uma cópia na loja, que aí sim é sua para revisar. PATCH na base
 * compartilhada é recusado pelo backend.
 */
import React, { useState } from 'react';
import { BeakerIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import api, { getErrorMessage } from '../../services/api';
import { adotarIngrediente } from '../../services/nutrition';
import { Button, Campo, CampoDeDinheiro, Input, Select } from '../../components/ui';
import { Switch } from '../../components/common';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { custoPorMil } from './custoDoIngrediente';

export type NutrientKey =
  | 'energy_kcal' | 'carbohydrates_g' | 'total_sugars_g' | 'added_sugars_g'
  | 'protein_g' | 'total_fat_g' | 'saturated_fat_g' | 'trans_fat_g'
  | 'fiber_g' | 'sodium_mg';

export interface Ingredient {
  id: string;
  /** `null` = alimento oficial da base compartilhada (somente leitura). */
  store: string | null;
  display_name: string;
  canonical_name: string;
  category: string;
  source: string;
  allergens?: string[];
  may_contain?: string[];
  allergens_reviewed?: boolean;
  [key: string]: unknown;
}

export interface Alergenico { valor: string; rotulo: string; gluten: boolean }

/** Nome que o lojista entende para cada fonte de dado nutricional. */
export const ROTULO_DA_FONTE: Record<string, string> = {
  taco: 'TACO', pof: 'POF/IBGE', tbca: 'TBCA', off: 'Fabricante', manufacturer: 'Fabricante', lab: 'Laudo', manual: 'Manual', calculated: 'Calculado',
};

export const NUTRIENTES: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'energy_kcal', label: 'Energia', unit: 'kcal' },
  { key: 'carbohydrates_g', label: 'Carboidratos', unit: 'g' },
  { key: 'total_sugars_g', label: 'Açúcares totais', unit: 'g' },
  { key: 'added_sugars_g', label: 'Açúcares adicionados', unit: 'g' },
  { key: 'protein_g', label: 'Proteínas', unit: 'g' },
  { key: 'total_fat_g', label: 'Gorduras totais', unit: 'g' },
  { key: 'saturated_fat_g', label: 'Gorduras saturadas', unit: 'g' },
  { key: 'trans_fat_g', label: 'Gorduras trans', unit: 'g' },
  { key: 'fiber_g', label: 'Fibra alimentar', unit: 'g' },
  { key: 'sodium_mg', label: 'Sódio', unit: 'mg' },
];

const VAZIO = {
  display_name: '', canonical_name: '', category: '', source: 'manual', default_unit: 'g',
} as Record<string, string>;

const UNIDADES = [
  { valor: 'g', rotulo: 'g' },
  { valor: 'ml', rotulo: 'ml' },
  { valor: 'un', rotulo: 'unidade' },
];

interface Props {
  /** `null` = novo ingrediente. */
  ingrediente: Ingredient | null;
  alergenicos: Alergenico[];
  storeUuid?: string;
  onFechar: () => void;
  onSalvo: () => void;
}

export function PainelDoIngrediente({ ingrediente, alergenicos, storeUuid, onFechar, onSalvo }: Props) {
  const editandoOficial = Boolean(ingrediente && !ingrediente.store);
  const [form, setForm] = useState<Record<string, string>>(() => ingrediente
    ? Object.fromEntries(Object.entries(ingrediente).map(([k, v]) => [k, v == null ? '' : String(v)]))
    : { ...VAZIO });
  // Alergênicos ficam FORA do `form` (que é tudo string) porque são listas.
  const [contem, setContem] = useState<string[]>(ingrediente?.allergens ?? []);
  const [podeConter, setPodeConter] = useState<string[]>(ingrediente?.may_contain ?? []);
  const [revisado, setRevisado] = useState(Boolean(ingrediente?.allergens_reviewed));
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo: string, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));
  const alternar = (lista: string[], set: (v: string[]) => void, valor: string) =>
    set(lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor]);

  const unidadeBase = form.default_unit || 'g';
  const unidadeDaCompra = form.unidade_compra || unidadeBase;
  const temPreco = Boolean(form.preco_pago || form.quantidade_comprada);
  const custoMil = custoPorMil({
    preco: form.preco_pago || '', quantidade: form.quantidade_comprada || '', unidade: unidadeDaCompra,
    porUnidade: form.quantidade_por_unidade || '', unidadeBase, densidade: form.density_g_ml || '',
  });

  const titulo = ingrediente ? ingrediente.display_name : 'Novo ingrediente';

  const salvar = async () => {
    if (!form.display_name.trim()) { toast.error('Informe o nome'); return; }
    // Só o que este formulário edita. Devolver o objeto inteiro stringificado
    // mandava `source_accessed_at: ""` de volta — "" não é data, e o
    // salvamento morria em 400 para TODOS os ingredientes.
    const payload = {
      display_name: form.display_name,
      canonical_name: form.canonical_name || form.display_name,
      category: form.category || '',
      store: ingrediente ? ingrediente.store : storeUuid,
      ...Object.fromEntries(NUTRIENTES.map(n =>
        [n.key, form[n.key] === '' || form[n.key] == null ? null : form[n.key]])),
      // Um alergênico marcado como "contém" nunca vai também em "pode conter":
      // a norma proíbe amaciar uma certeza com advertência de traço.
      allergens: contem,
      may_contain: podeConter.filter(v => !contem.includes(v)),
      allergens_reviewed: revisado,
      // Ficha de custo. Em branco é "não sei quanto pago" — nunca zero, que
      // faria o prato parecer mais barato do que é.
      preco_pago: form.preco_pago || null,
      quantidade_comprada: form.quantidade_comprada || null,
      unidade_compra: temPreco ? unidadeDaCompra : '',
      quantidade_por_unidade: temPreco && unidadeDaCompra === 'un' ? form.quantidade_por_unidade || null : null,
    };
    setSalvando(true);
    try {
      if (editandoOficial) {
        if (!storeUuid) { toast.error('Loja não identificada'); return; }
        const { store: _ignorado, ...camposAdotados } = payload;
        await adotarIngrediente(ingrediente!.id, storeUuid, camposAdotados);
        toast.success('Alimento adotado na sua loja — agora ele é seu para editar');
      } else if (ingrediente) {
        await api.patch(`/nutrition/ingredients/${ingrediente.id}/`, payload);
        toast.success('Ingrediente salvo');
      } else {
        await api.post('/nutrition/ingredients/', payload);
        toast.success('Ingrediente criado');
      }
      onSalvo();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const chip = (on: boolean, tom: 'perigo' | 'alerta') => cn(
    'rounded-full border px-2.5 py-1 text-xs transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
    on
      ? tom === 'perigo'
        ? 'border-[var(--danger)] bg-[var(--danger-soft)] font-semibold text-[var(--danger)]'
        : 'border-[var(--warning)] bg-[var(--warning-soft)] font-semibold text-[var(--warning)]'
      : 'border-border-token text-fg-muted-token hover:text-fg-token',
  );

  return (
    <aside
      aria-label={titulo}
      className="superficie flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden lg:sticky lg:top-4"
    >
      <header className="flex items-center gap-2 border-b border-border-token px-5 py-3">
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-fg-token">{titulo}</h2>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="rounded p-1.5 text-fg-muted-token transition hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
        {editandoOficial && (
          <p className="flex items-center gap-2 rounded bg-[var(--info-soft)] px-3 py-2 text-sm text-fg-token">
            <BeakerIcon className="h-4 w-4 shrink-0" aria-hidden />
            {ROTULO_DA_FONTE[ingrediente?.source ?? ''] ?? ingrediente?.source} · base de todas as lojas
          </p>
        )}

        <section className="grid grid-cols-2 gap-3">
          <Campo rotulo="Nome" className="col-span-2">
            <Input
              value={form.display_name || ''}
              onChange={e => setForm({ ...form, display_name: e.target.value, canonical_name: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Categoria" className="col-span-2">
            <Input value={form.category || ''} onChange={e => mudar('category', e.target.value)} />
          </Campo>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-fg-token">Por 100 g</h3>
          <div className="grid grid-cols-2 gap-3">
            {NUTRIENTES.map(n => (
              <Campo key={n.key} rotulo={n.label}>
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  size="sm"
                  className="text-right tabular-nums"
                  rightAddon={n.unit}
                  value={form[n.key] || ''}
                  onChange={e => mudar(n.key, e.target.value)}
                />
              </Campo>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-fg-token">Quanto você paga</h3>
          <div className="grid grid-cols-2 gap-3">
            <CampoDeDinheiro
              rotulo="Paguei"
              valor={form.preco_pago ? Number(form.preco_pago) : null}
              onMudar={(v) => mudar('preco_pago', v == null ? '' : String(v))}
            />
            <Campo rotulo="Quantidade comprada">
              <Input
                type="number" min="0" step="0.001"
                className="text-right tabular-nums"
                value={form.quantidade_comprada || ''}
                onChange={e => mudar('quantidade_comprada', e.target.value)}
              />
            </Campo>
            <Select
              rotulo="Unidade"
              opcoes={UNIDADES}
              valor={unidadeDaCompra}
              onMudar={(v) => mudar('unidade_compra', v)}
            />
            {unidadeDaCompra === 'un' && (
              <Campo rotulo={`Cada unidade tem (${unidadeBase})`}>
                <Input
                  type="number" min="0" step="0.001"
                  className="text-right tabular-nums"
                  value={form.quantidade_por_unidade || ''}
                  onChange={e => mudar('quantidade_por_unidade', e.target.value)}
                />
              </Campo>
            )}
          </div>
          {(custoMil != null || (form.preco_pago && form.quantidade_comprada)) && (
            <p className="text-sm tabular-nums text-fg-token">
              {custoMil != null
                ? `= ${formatCurrency(custoMil)} por ${unidadeBase === 'ml' ? 'litro' : 'kg'}`
                : unidadeDaCompra === 'un'
                  ? 'Falta quanto vem em cada unidade'
                  : `A receita usa ${unidadeBase}: informe a compra em ${unidadeBase} ou por unidade`}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-fg-token">
            Alergênicos <span className="text-xs font-normal text-fg-muted-token">RDC 26/2015</span>
          </h3>
          <div role="group" aria-label="Contém" className="space-y-1.5">
            <p className="text-xs font-medium text-fg-muted-token">Contém</p>
            <div className="flex flex-wrap gap-1.5">
              {alergenicos.map(a => {
                const on = contem.includes(a.valor);
                return (
                  <button key={a.valor} type="button" aria-pressed={on}
                    onClick={() => alternar(contem, setContem, a.valor)} className={chip(on, 'perigo')}>
                    {a.rotulo}{a.gluten && ' ⚠'}
                  </button>
                );
              })}
            </div>
          </div>
          <div role="group" aria-label="Pode conter" className="space-y-1.5">
            <p className="text-xs font-medium text-fg-muted-token">Pode conter</p>
            <div className="flex flex-wrap gap-1.5">
              {alergenicos.filter(a => !contem.includes(a.valor)).map(a => {
                const on = podeConter.includes(a.valor);
                return (
                  <button key={a.valor} type="button" aria-pressed={on}
                    onClick={() => alternar(podeConter, setPodeConter, a.valor)} className={chip(on, 'alerta')}>
                    {a.rotulo}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Lista vazia sem esta marca significa "ninguém olhou", não "não tem". */}
          <div className="flex items-center justify-between gap-3 rounded border border-border-token px-3 py-2.5">
            <span className="text-sm font-medium text-fg-token">Conferi na embalagem</span>
            <Switch checked={revisado} onChange={setRevisado} ariaLabel="Alergênicos revisados" />
          </div>
        </section>
      </div>

      <footer className="flex justify-end gap-2 border-t border-border-token px-5 py-3">
        <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
        <Button onClick={salvar} isLoading={salvando} disabled={salvando}>
          {editandoOficial ? 'Adotar na minha loja' : ingrediente ? 'Salvar ingrediente' : 'Criar ingrediente'}
        </Button>
      </footer>
    </aside>
  );
}

export default PainelDoIngrediente;
