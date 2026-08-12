/**
 * Ingredientes e base TACO/POF.
 *
 * DUAS COISAS QUE A TELA ANTIGA ERRAVA (12/ago):
 *
 * 1. Ela tratava alimento oficial e ingrediente da loja como a mesma coisa: o
 *    nome de qualquer linha abria o formulário de edição, com os alergênicos
 *    marcáveis e a caixa "revisados" clicável. Salvar respondia 400 — a base
 *    TACO/POF é compartilhada entre todos os lojistas e o backend a protege.
 *    Agora o oficial abre em modo LEITURA e o botão diz o que vai acontecer:
 *    adotar uma cópia dentro da loja, que aí sim é sua para revisar.
 *
 * 2. A cor era escrita em `black/15` e `bg-black/80`, que no painel escuro dá
 *    borda invisível e aba preta sobre carvão. Aqui é tudo token do painel.
 *
 * Também deixou de chamar de "não revisado" os 2.561 alimentos oficiais: o
 * aviso âmbar existe para cobrar o lojista do que é dele, e repetido em duas
 * mil linhas que ele não pode revisar vira ruído que ensina a ignorar.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BeakerIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import api, { getErrorMessage, normalizePaginatedResponse } from '../../services/api';
import { adotarIngrediente } from '../../services/nutrition';
import { getStores } from '../../services/storesApi';
import { Badge, Button, Card, Modal, PageShell, SearchInput } from '../../components/ui';
import { Loading } from '../../components/common';
import RecipeBuilder from './RecipeBuilder';
import { useConfirm } from '../../hooks/useConfirm';

type NutrientKey =
  | 'energy_kcal' | 'carbohydrates_g' | 'total_sugars_g' | 'added_sugars_g'
  | 'protein_g' | 'total_fat_g' | 'saturated_fat_g' | 'trans_fat_g'
  | 'fiber_g' | 'sodium_mg';

interface Ingredient {
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

interface Alergenico { valor: string; rotulo: string; gluten: boolean }

const nutrients: { key: NutrientKey; label: string; unit: string }[] = [
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

const empty = {
  display_name: '', canonical_name: '', category: '', source: 'manual', default_unit: 'g',
} as Record<string, string>;

export default function IngredientsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [aba, setAba] = useState<'loja' | 'base'>('loja');
  const [totalBase, setTotalBase] = useState(0);
  // Com 2.5 mil alimentos oficiais, buscar só no que já baixou acha o que não
  // interessa e esconde o que interessa. A busca da base vai ao servidor.
  const [buscaBase, setBuscaBase] = useState('');
  useEffect(() => {
    if (aba !== 'base') return undefined;
    const id = setTimeout(() => setBuscaBase(search), 400);
    return () => clearTimeout(id);
  }, [search, aba]);

  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [ConfirmDialog, confirmAction] = useConfirm();
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [storeUuid, setStoreUuid] = useState<string>();
  // Alergênicos ficam FORA do `form` (que é tudo string) porque são listas.
  const [alergenicos, setAlergenicos] = useState<Alergenico[]>([]);
  const [contem, setContem] = useState<string[]>([]);
  const [podeConter, setPodeConter] = useState<string[]>([]);
  const [revisado, setRevisado] = useState(false);

  /** Oficial = da base compartilhada. Editar direto é proibido; adota-se. */
  const editandoOficial = Boolean(editing && !editing.store);

  // A lista dos 21 grupos da RDC 26/2015 vem da API: repetir a lista legal
  // aqui garantiria que um dia as duas divirjam.
  useEffect(() => {
    api.get('/nutrition/alergenicos/')
      .then(r => setAlergenicos(r.data.alergenicos || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const stores = await getStores();
      const store = stores.results?.find(s => s.slug === storeId || s.id === storeId);
      setStoreUuid(store?.id);
      // Duas chamadas com `escopo` separado: os ~70 da loja não podem depender
      // de cair nos primeiros 500 de uma lista alfabética com 2.5 mil oficiais.
      const [meus, base] = await Promise.all([
        api.get('/nutrition/ingredients/', { params: { store: store?.id, escopo: 'loja', page_size: 500 } }),
        api.get('/nutrition/ingredients/', { params: { escopo: 'base', page_size: 500, search: buscaBase } }),
      ]);
      setItems([
        ...normalizePaginatedResponse<Ingredient>(meus.data),
        ...normalizePaginatedResponse<Ingredient>(base.data),
      ]);
      setTotalBase(base.data?.count ?? 0);
    } catch {
      toast.error('Não foi possível carregar os ingredientes');
    } finally {
      setLoading(false);
    }
  }, [storeId, buscaBase]);
  useEffect(() => { load(); }, [load]);

  const categories = useMemo(
    () => [...new Set(items.map(i => i.category).filter(Boolean))].sort(),
    [items],
  );
  // A base pública enterrava tudo que é da loja — inclusive o construtor de
  // receita, que ficava abaixo da dobra.
  const daLoja = items.filter(i => i.store);
  const daBase = items.filter(i => !i.store);
  const fonte = aba === 'loja' ? daLoja : daBase;
  const visible = fonte.filter(i =>
    (!category || i.category === category)
    && (!search || i.display_name.toLowerCase().includes(search.toLowerCase())));

  const naoRevisados = daLoja.filter(i => !i.allergens_reviewed).length;

  const abrir = (item?: Ingredient) => {
    setEditing(item || null);
    setForm(item
      ? Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v == null ? '' : String(v)]))
      : { ...empty });
    setContem(item?.allergens ?? []);
    setPodeConter(item?.may_contain ?? []);
    setRevisado(Boolean(item?.allergens_reviewed));
    setModalOpen(true);
  };

  const fechar = () => { setModalOpen(false); setEditing(null); setForm(empty); };

  const alternar = (lista: string[], set: (v: string[]) => void, valor: string) =>
    set(lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor]);

  const save = async () => {
    if (!form.display_name.trim()) { toast.error('Informe o nome'); return; }
    // Só o que este formulário edita. Devolver o objeto inteiro stringificado
    // mandava `source_accessed_at: ""` de volta — o campo de data é nulo em
    // todo ingrediente, "" não é data, e o salvamento morria em 400 para
    // TODOS eles. Formulário posta o que edita, não o que recebeu.
    const payload = {
      display_name: form.display_name,
      canonical_name: form.canonical_name || form.display_name,
      category: form.category || '',
      store: editing ? editing.store : storeUuid,
      ...Object.fromEntries(nutrients.map(n =>
        [n.key, form[n.key] === '' || form[n.key] == null ? null : form[n.key]])),
      // Um alergênico marcado como "contém" nunca vai também em "pode conter":
      // a norma proíbe amaciar uma certeza com advertência de traço.
      allergens: contem,
      may_contain: podeConter.filter(v => !contem.includes(v)),
      allergens_reviewed: revisado,
    };
    setSalvando(true);
    try {
      if (editandoOficial) {
        // Base compartilhada: PATCH é recusado. Adotar cria a cópia da loja
        // com a revisão já aplicada e reaponta as receitas desta loja.
        if (!storeUuid) { toast.error('Loja não identificada'); return; }
        const { store: _ignorado, ...camposAdotados } = payload;
        await adotarIngrediente(editing!.id, storeUuid, camposAdotados);
        toast.success('Alimento adotado na sua loja — agora ele é seu para editar');
      } else if (editing) {
        await api.patch(`/nutrition/ingredients/${editing.id}/`, payload);
        toast.success('Ingrediente salvo');
      } else {
        await api.post('/nutrition/ingredients/', payload);
        toast.success('Ingrediente criado');
      }
      fechar();
      setAba('loja');
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const remove = async (item: Ingredient) => {
    const ok = await confirmAction({
      title: 'Desativar ingrediente',
      message: `Desativar "${item.display_name}"? Ele some das listas, mas as receitas que já o usam continuam válidas.`,
      confirmText: 'Desativar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/nutrition/ingredients/${item.id}/`);
      await load();
    } catch {
      toast.error('Ingrediente usado em receita não pode ser removido');
    }
  };

  if (loading) return <Loading />;

  const abas = [
    { id: 'loja' as const, rotulo: `Meus ingredientes (${daLoja.length})` },
    { id: 'base' as const, rotulo: `Base TACO/POF (${totalBase || daBase.length})` },
  ];

  const filtros = (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="tablist"
        aria-label="Origem do ingrediente"
        className="inline-flex overflow-hidden rounded-lg border border-border-token text-sm"
      >
        {abas.map(({ id, rotulo }) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            type="button"
            onClick={() => setAba(id)}
            className={aba === id
              ? 'bg-[var(--brand)] px-3 py-1.5 font-medium text-[var(--on-brand)]'
              : 'px-3 py-1.5 text-fg-muted-token transition hover:bg-surface/5'}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <div className="min-w-56 flex-1">
        <SearchInput
          placeholder={aba === 'base' ? 'Buscar na TACO/POF…' : 'Buscar ingrediente…'}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
      </div>
      <select
        className="rounded border border-border-token bg-surface px-3 py-2 text-sm text-fg-token"
        value={category}
        onChange={e => setCategory(e.target.value)}
      >
        <option value="">Todas as categorias</option>
        {categories.map(c => <option key={c}>{c}</option>)}
      </select>
    </div>
  );

  return (
    <PageShell
      titulo="Ingredientes e TACO"
      descricao="Valores por 100 g, com fonte explícita. Campo ausente não vira zero."
      trilha={[{ rotulo: 'Produtos', href: `/stores/${storeId}/products` }, { rotulo: 'Ingredientes e TACO' }]}
      acoes={<Button onClick={() => abrir()}><PlusIcon className="h-5 w-5" />Novo ingrediente</Button>}
      filtros={filtros}
    >
      {ConfirmDialog}

      <div className="space-y-5">
        <RecipeBuilder storeSlug={storeId} storeUuid={storeUuid} ingredients={items} />

        {aba === 'loja' && naoRevisados > 0 && (
          <p className="text-sm text-[var(--warning)]">
            {naoRevisados} ingrediente(s) seus ainda sem revisão de alergênicos — a
            etiqueta das receitas que os usam não declara nada até você conferir.
          </p>
        )}
        {aba === 'base' && (
          <p className="text-sm text-fg-muted-token">
            Catálogo oficial, compartilhado por todas as lojas e por isso somente
            leitura. Para usar um alimento e revisar os alergênicos dele, abra e
            escolha <b>Adotar na minha loja</b> — vira uma cópia sua.
            {totalBase > daBase.length && (
              <> Mostrando {daBase.length} de {totalBase}: refine a busca para chegar no resto.</>
            )}
          </p>
        )}

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-fg-muted-token">
                <tr>
                  <th className="p-3 text-left">Ingrediente</th>
                  <th className="p-3 text-left">Fonte</th>
                  <th className="p-3 text-left">Alergênicos</th>
                  {nutrients.map(n => (
                    <th key={n.key} className="whitespace-nowrap p-3 text-right">
                      {n.label}
                      <span className="block text-xs font-normal opacity-60">{n.unit}/100g</span>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={nutrients.length + 4} className="p-8 text-center text-fg-muted-token">
                      {search || category
                        ? 'Nenhum ingrediente com esse filtro.'
                        : 'Nada aqui ainda.'}
                    </td>
                  </tr>
                )}
                {visible.map(i => (
                  <tr key={i.id} className="border-t border-border-token hover:bg-surface/5">
                    <td className="p-3">
                      <button
                        className="text-left font-medium text-fg-token hover:underline"
                        onClick={() => abrir(i)}
                      >
                        {i.display_name}
                      </button>
                      <div className="text-xs text-fg-muted-token">{i.category || 'Sem categoria'}</div>
                    </td>
                    <td className="p-3 text-xs uppercase text-fg-muted-token">{i.source}</td>
                    <td className="p-3 text-xs">
                      {i.allergens?.length
                        ? <span className="text-[var(--danger)]">{i.allergens.join(', ')}</span>
                        : i.allergens_reviewed
                          ? <span className="text-fg-muted-token">sem alergênico</span>
                          // Cobrar revisão só faz sentido no que é da loja: o
                          // oficial ninguém pode revisar sem adotar antes.
                          : i.store
                            ? <Badge tone="warning">não revisado</Badge>
                            : <span className="text-fg-muted-token">—</span>}
                    </td>
                    {nutrients.map(n => (
                      <td key={n.key} className="p-3 text-right tabular-nums">
                        {i[n.key] == null ? '—' : String(i[n.key])}
                      </td>
                    ))}
                    <td className="p-3">
                      {i.store
                        ? (
                          <button
                            aria-label={`Excluir ${i.display_name}`}
                            onClick={() => remove(i)}
                            className="p-2 text-fg-muted-token transition hover:text-[var(--danger)]"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )
                        : <span className="px-2 text-xs text-fg-muted-token">oficial</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={fechar}
        size="xl"
        title={editandoOficial
          ? `Alimento oficial — ${editing?.display_name}`
          : editing ? 'Editar ingrediente' : 'Novo ingrediente'}
      >
        <div className="space-y-4">
          {editandoOficial && (
            <div className="rounded-lg border border-[var(--info)]/35 bg-[var(--info-soft)] p-3 text-sm">
              <p className="font-medium text-fg-token">
                <BeakerIcon className="mr-1 inline h-4 w-4" />
                Este alimento vem da {editing?.source?.toUpperCase()} e é compartilhado por todas as lojas.
              </p>
              <p className="mt-1 text-fg-muted-token">
                Ele não pode ser alterado no lugar. Ao salvar, uma <b>cópia sua</b> é
                criada com o que você ajustar aqui, e as receitas desta loja passam a
                apontar para ela. O oficial continua intacto.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-fg-muted-token">
              Nome
              <input
                className="mt-1 w-full rounded border border-border-token bg-surface p-2 text-fg-token"
                value={form.display_name || ''}
                onChange={e => setForm({ ...form, display_name: e.target.value, canonical_name: e.target.value })}
              />
            </label>
            <label className="text-sm text-fg-muted-token">
              Categoria
              <input
                className="mt-1 w-full rounded border border-border-token bg-surface p-2 text-fg-token"
                value={form.category || ''}
                onChange={e => setForm({ ...form, category: e.target.value })}
              />
            </label>
            {nutrients.map(n => (
              <label key={n.key} className="text-sm text-fg-muted-token">
                {n.label} ({n.unit}/100 g)
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className="mt-1 w-full rounded border border-border-token bg-surface p-2 text-right tabular-nums text-fg-token"
                  value={form[n.key] || ''}
                  onChange={e => setForm({ ...form, [n.key]: e.target.value })}
                />
              </label>
            ))}
          </div>

          <section className="space-y-3 border-t border-border-token pt-4">
            <div>
              <h3 className="font-semibold text-fg-token">
                Alergênicos <span className="text-xs font-normal text-fg-muted-token">RDC 26/2015</span>
              </h3>
              <p className="text-xs text-fg-muted-token">
                A etiqueta monta a frase sozinha a partir daqui. Enquanto houver
                ingrediente não revisado na receita, ela não declara nada — melhor
                calar que afirmar “não contém” sem alguém ter olhado.
              </p>
            </div>

            <div>
              <div className="mb-1 text-sm font-medium text-fg-token">Contém</div>
              <div className="flex flex-wrap gap-1.5">
                {alergenicos.map(a => {
                  const on = contem.includes(a.valor);
                  return (
                    <button
                      key={a.valor}
                      type="button"
                      aria-pressed={on}
                      onClick={() => alternar(contem, setContem, a.valor)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${on
                        ? 'border-[var(--danger)] bg-[var(--danger)] text-white'
                        : 'border-border-token text-fg-muted-token hover:text-fg-token'}`}
                    >
                      {a.rotulo}{a.gluten && ' ⚠'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm font-medium text-fg-token">
                Pode conter{' '}
                <span className="text-xs font-normal text-fg-muted-token">(contaminação cruzada)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {alergenicos.filter(a => !contem.includes(a.valor)).map(a => {
                  const on = podeConter.includes(a.valor);
                  return (
                    <button
                      key={a.valor}
                      type="button"
                      aria-pressed={on}
                      onClick={() => alternar(podeConter, setPodeConter, a.valor)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${on
                        ? 'border-[var(--warning)] bg-[var(--warning)] text-[#1a1a1a]'
                        : 'border-border-token text-fg-muted-token hover:text-fg-token'}`}
                    >
                      {a.rotulo}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2 rounded border border-border-token p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={revisado}
                onChange={e => setRevisado(e.target.checked)}
              />
              <span>
                <b className="text-fg-token">Alergênicos revisados</b>
                <span className="block text-xs text-fg-muted-token">
                  Marque só depois de conferir a embalagem ou a ficha técnica. Lista
                  vazia sem esta marca significa “ninguém olhou”, não “não tem”.
                </span>
              </span>
            </label>
          </section>

          <p className="text-xs text-fg-muted-token">
            Use “—”/vazio quando a fonte não informar o nutriente. Para impressão
            oficial, complete açúcares e gorduras com ficha do fabricante, TBCA ou laudo.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={fechar}>Cancelar</Button>
            <Button onClick={save} disabled={salvando}>
              {salvando
                ? 'Salvando…'
                : editandoOficial ? 'Adotar na minha loja' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
