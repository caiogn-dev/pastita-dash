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
import { formatarNutriente } from './rotulosDeNutriente';
import { useParams, useSearchParams } from 'react-router-dom';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import api, { normalizePaginatedResponse } from '../../services/api';
import { getStores } from '../../services/storesApi';
import { Badge, Button, PageShell, SearchInput, Segmentado, Select, Tabela, RowActions } from '../../components/ui';
import { Loading } from '../../components/common';
import RecipeBuilder from './RecipeBuilder';
import TabelaDeCustos from './TabelaDeCustos';
import { useConfirm } from '../../hooks/useConfirm';
import { PortaoDoAdicional } from '../../components/billing/PortaoDoAdicional';
import { ADICIONAL_ETIQUETA } from '../../services/billing';
import { cn } from '../../utils/cn';
import {
  NUTRIENTES as nutrients,
  PainelDoIngrediente,
  ROTULO_DA_FONTE,
  type Alergenico,
  type Ingredient,
} from './PainelDoIngrediente';

function IngredientesDaLoja() {
  const { storeId } = useParams<{ storeId: string }>();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [aba, setAba] = useState<'loja' | 'base' | 'custos'>('loja');
  const [totalBase, setTotalBase] = useState(0);
  // Com 2.5 mil alimentos oficiais, buscar só no que já baixou acha o que não
  // interessa e esconde o que interessa. A busca da base vai ao servidor.
  const [buscaBase, setBuscaBase] = useState('');
  useEffect(() => {
    if (aba !== 'base') return undefined;
    const id = setTimeout(() => setBuscaBase(search), 400);
    return () => clearTimeout(id);
  }, [search, aba]);

  const [ConfirmDialog, confirmAction] = useConfirm();
  const [storeUuid, setStoreUuid] = useState<string>();
  const [alergenicos, setAlergenicos] = useState<Alergenico[]>([]);
  // Ingrediente aberto mora na URL: recarregar ou mandar o link não perde o lugar.
  const [params, setParams] = useSearchParams();
  const aberto = params.get('ingrediente');

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
    const proximo = new URLSearchParams(params);
    proximo.set('ingrediente', item ? String(item.id) : 'novo');
    setParams(proximo, { replace: true });
  };

  const fechar = () => {
    const proximo = new URLSearchParams(params);
    proximo.delete('ingrediente');
    setParams(proximo, { replace: true });
  };

  const painelAberto = aberto === 'novo' || Boolean(aberto && items.some(i => String(i.id) === aberto));
  const editando = aberto && aberto !== 'novo' ? items.find(i => String(i.id) === aberto) ?? null : null;

  const aoSalvar = async () => {
    fechar();
    setAba('loja');
    await load();
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
    { id: 'custos' as const, rotulo: 'Custo e margem' },
  ];

  const filtros = (
    <div className="flex flex-wrap items-center gap-3">
      <Segmentado
        rotulo="Origem do ingrediente"
        opcoes={abas.map(({ id, rotulo }) => ({ valor: id, rotulo }))}
        valor={aba}
        onChange={setAba}
      />
      {aba !== 'custos' && <>
      <div className="min-w-56 flex-1">
        <SearchInput
          placeholder={aba === 'base' ? 'Buscar na TACO/POF…' : 'Buscar ingrediente…'}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
      </div>
      <Select
        rotuloOculto="Categoria"
        vazio="Todas as categorias"
        opcoes={categories.map(c => ({ valor: c, rotulo: c }))}
        valor={category}
        onMudar={setCategory}
      />
      </>}
    </div>
  );

  return (
    <PageShell
      titulo="Tabela nutricional"
     
      trilha={[{ rotulo: 'Produtos', href: `/stores/${storeId}/products` }, { rotulo: 'Tabela nutricional' }]}
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
        {aba === 'base' && totalBase > daBase.length && (
          <p className="text-sm text-fg-muted-token">Mostrando {daBase.length} de {totalBase}. Refine a busca.</p>
        )}

        {aba === 'custos' ? <TabelaDeCustos storeUuid={storeUuid} /> : (
        // Lista + painel: a edição abre AO LADO. Com o painel aberto a tabela
        // fica só com nome e alergênicos — os dez nutrientes já estão no painel.
        // No celular o painel toma a tela e "Fechar" devolve a lista.
        <div className={cn('grid gap-5', painelAberto && 'lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start')}>
        <div className={cn('min-w-0', painelAberto && 'max-lg:hidden')}>
        <Tabela<(typeof visible)[number]>
          itens={visible}
          chave={(i) => String(i.id)}
          rotuloDaLinha={(i) => `Abrir ${i.display_name}`}
          onAbrir={abrir}
          vazio={{
            titulo: search || category ? 'Nenhum ingrediente com esse filtro' : 'Nada aqui ainda',
          }}
          colunas={[
            {
              chave: 'ingrediente',
              cabecalho: 'Ingrediente · por 100 g',
              render: (i) => (
                <div className="min-w-0">
                  <span className="font-medium text-fg-token">{i.display_name}</span>
                  <div className="text-xs text-fg-muted-token">{i.category || 'Sem categoria'}</div>
                </div>
              ),
            },
            {
              chave: 'fonte',
              cabecalho: 'Fonte',
              classe: painelAberto ? 'hidden' : 'max-lg:hidden',
              render: (i) => <span className="text-xs text-fg-muted-token" title={i.source === 'off' ? 'Rótulo do fabricante, via Open Food Facts' : undefined}>{ROTULO_DA_FONTE[i.source] ?? i.source}</span>,
            },
            {
              chave: 'alergenicos',
              cabecalho: 'Alergênicos',
              render: (i) =>
                i.allergens?.length ? (
                  <span className="text-xs text-[var(--danger)]">{i.allergens.join(', ')}</span>
                ) : i.allergens_reviewed ? (
                  <span className="text-xs text-fg-muted-token">sem alergênico</span>
                ) : // Cobrar revisão só faz sentido no que é da loja: o
                // oficial ninguém pode revisar sem adotar antes.
                i.store ? (
                  <Badge tone="warning">não revisado</Badge>
                ) : (
                  <span className="text-fg-muted-token">—</span>
                ),
            },
            ...(painelAberto ? [] : nutrients).map((n) => ({
              chave: n.key,
              cabecalho: `${n.label} (${n.unit})`,
              alinhamento: 'direita' as const,
              classe: 'tabular-nums max-xl:hidden',
              // Em branco quando não se sabe. Virar zero aqui é mentira no
              // rótulo — e rótulo errado é multa da ANVISA.
              render: (i: (typeof visible)[number]) => formatarNutriente(n.key, i[n.key]),
            })),
            {
              chave: 'acoes',
              cabecalho: 'Ações',
              alinhamento: 'direita',
              render: (i) =>
                i.store ? (
                  <RowActions
                    rotulo={`Ações de ${i.display_name}`}
                    acoes={[
                      {
                        rotulo: 'Excluir',
                        icone: <TrashIcon className="h-4 w-4" />,
                        destrutiva: true,
                        onClick: () => remove(i),
                      },
                    ]}
                  />
                ) : (
                  <span className="px-2 text-xs text-fg-muted-token">oficial</span>
                ),
            },
          ]}
        />
        </div>
        {painelAberto && (
          <PainelDoIngrediente
            key={aberto ?? ''}
            ingrediente={editando}
            alergenicos={alergenicos}
            storeUuid={storeUuid}
            onFechar={fechar}
            onSalvo={aoSalvar}
          />
        )}
        </div>
        )}
      </div>

    </PageShell>
  );
}

/** Receitas e etiqueta nutricional são o adicional Etiqueta ANVISA. O menu
 *  continua visível para todos: quem clica sem ter vê o que ganharia. */
export default function IngredientsPage() {
  return (
    <PortaoDoAdicional chave={ADICIONAL_ETIQUETA} titulo="Tabela nutricional">
      <IngredientesDaLoja />
    </PortaoDoAdicional>
  );
}
