import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import logger from '../../services/logger';
import { formatCurrency } from '../../utils/formatters';
import {
  PlusIcon,
  PencilIcon,
  MegaphoneIcon,
  TrashIcon,
  TagIcon,
  ArrowLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Loading } from '../../components/common';
import {
  PageShell,
  Button,
  Card,
  Badge,
  StatCard,
  RowActions,
  InsightList,
  Tabela,
  SearchInput,
  Select,
  Input,
  Campo,
  CampoDeDinheiro,
  CampoDeTelefone,
  Switch,
  Secao,
  SeloDeEstado,
  Skeleton,
  estadoDeCupom,
} from '../../components/ui';
import { cn } from '../../utils/cn';
import { insightsDeCupons } from './insightsDeCupons';
import { couponsService, Coupon, CreateCoupon, UpdateCoupon, CouponStats } from '../../services/coupons';
import { getCategories, StoreCategory } from '../../services/storesApi';
import { useStore } from '../../hooks';
import { textoDeDivulgacao } from './divulgacaoDoCupom';
import { buildStorefrontUrl } from '../../utils/storefrontUrl';
import { copyToClipboard } from '../../utils/clipboard';
// Direto do arquivo: o barrel `hooks` é mockado inteiro nos testes da tela.
import { useConfirm } from '../../hooks/useConfirm';

/**
 * Códigos sugeridos.
 *
 * Campo de código é página em branco: o lojista trava escolhendo o nome, e o
 * nome importa muito menos que existir um cupom no ar. Estes cobrem os três
 * usos que aparecem em toda loja — primeira compra, promoção genérica, data
 * comemorativa.
 */
const POR_PAGINA = 20;

const SUGESTOES_DE_CODIGO = ['BEMVINDO10', 'PROMO15', 'VOLTEI10'] as const;

/** Valor de `?cupom=` que abre o painel em branco, para criar. */
const NOVO = 'novo';

const TIPOS_DE_DESCONTO = [
  { valor: 'percentage', rotulo: 'Porcentagem (%)' },
  { valor: 'fixed', rotulo: 'Valor fixo (R$)' },
];

export const CouponsPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();
  const [ConfirmDialog, confirm] = useConfirm();
  const [params, setParams] = useSearchParams();

  // Resolve route param (could be slug or UUID) to UUID
  const storeId = useMemo(() => {
    if (!routeStoreId) return contextStoreId || undefined;
    const match = stores.find(s => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || contextStoreId || undefined;
  }, [routeStoreId, contextStoreId, stores]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  // Falhou a última busca: a tabela troca o "nenhum cupom" pelo erro.
  const [falhou, setFalhou] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [filterType, setFilterType] = useState<'percentage' | 'fixed' | ''>('');

  // O cupom aberto mora na URL: recarregar a página (ou mandar o link) volta
  // para o mesmo painel. `novo` = criação; qualquer outro valor = id.
  const cupomParam = params.get('cupom');
  const emCriacao = cupomParam === NOVO;
  const cupomId = cupomParam && !emCriacao ? cupomParam : null;
  const painelAberto = Boolean(cupomParam);

  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  // Erros do formulário só aparecem depois da primeira tentativa de salvar:
  // vermelho em campo que a pessoa ainda nem tocou é bronca antes da hora.
  const [tentouSalvar, setTentouSalvar] = useState(false);

  // Form state - includes store ID
  const getInitialFormData = useCallback((): CreateCoupon => ({
    store: storeId || undefined,
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_purchase: 0,
    max_discount: null,
    usage_limit: null,
    usage_limit_per_user: null,
    first_order_only: false,
    parceiro_phone: '',
    parceiro_percent: '',
    applicable_categories: [],
    is_active: true,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }), [storeId]);

  const [formData, setFormData] = useState<CreateCoupon>(getInitialFormData());
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  // Categorias da loja alimentam o escopo opcional do cupom
  useEffect(() => {
    if (!storeId) return;
    getCategories(storeId)
      .then((res) => setCategories(res.results))
      .catch(() => setCategories([]));
  }, [storeId]);

  const toggleCategory = (id: string) => {
    setFormData((prev) => {
      const current = prev.applicable_categories ?? [];
      return {
        ...prev,
        applicable_categories: current.includes(id)
          ? current.filter((c) => c !== id)
          : [...current, id],
      };
    });
  };

  const loadCoupons = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [couponsData, statsData] = await Promise.all([
        couponsService.getCoupons({
          store: storeId,
          search: search || undefined,
          is_active: filterActive,
          discount_type: filterType || undefined,
          // Sem `page`, o backend devolve a primeira página e a tela some
          // com o resto sem avisar: a Cê Saladas tem 35 cupons e via 20.
          page,
          page_size: POR_PAGINA,
        }),
        couponsService.getStats(storeId),
      ]);
      setCoupons(couponsData.results);
      setTotal(couponsData.count ?? couponsData.results.length);
      setStats(statsData);
      setFalhou(false);
    } catch (err) {
      logger.error('Error loading coupons:', err);
      setFalhou(true);
      toast.error('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  }, [search, filterActive, filterType, storeId, page]);

  // Reload when store changes
  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // Filtro novo recomeça na primeira página: buscar estando na página 2 de um
  // resultado que agora tem uma página só devolveria uma lista vazia.
  useEffect(() => {
    setPage(1);
  }, [search, filterActive, filterType, storeId]);

  // Update form data when store changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, store: storeId || undefined }));
  }, [storeId]);

  /** Abre (ou fecha, com `null`) o painel mexendo só no `?cupom=`. */
  const irParaCupom = useCallback(
    (valor: string | null) => {
      setParams(
        (atual) => {
          const proximo = new URLSearchParams(atual);
          if (valor) proximo.set('cupom', valor);
          else proximo.delete('cupom');
          return proximo;
        },
        // Fechar não empilha histórico: o "voltar" do navegador não pode
        // reabrir um painel que a pessoa acabou de fechar.
        { replace: valor === null },
      );
    },
    [setParams]
  );

  const preencherFormulario = useCallback((coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase: coupon.min_purchase,
      max_discount: coupon.max_discount,
      usage_limit: coupon.usage_limit,
      usage_limit_per_user: coupon.usage_limit_per_user ?? null,
      first_order_only: coupon.first_order_only ?? false,
      parceiro_phone: coupon.parceiro_phone ?? '',
      parceiro_percent: coupon.parceiro_percent ?? '',
      applicable_categories: coupon.applicable_categories ?? [],
      is_active: coupon.is_active,
      valid_from: coupon.valid_from.split('T')[0],
      valid_until: coupon.valid_until.split('T')[0],
    });
  }, []);

  // Qual `?cupom=` o formulário já carregou. Sem isto, cada recarga da lista
  // (depois de salvar, de filtrar) devolveria o formulário ao que veio do
  // servidor e apagaria o que a pessoa está digitando.
  const carregadoRef = useRef<string | null>(null);
  const buscandoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cupomParam) {
      carregadoRef.current = null;
      setEditingCoupon(null);
      setTentouSalvar(false);
      return;
    }
    if (carregadoRef.current === cupomParam) return;

    if (emCriacao) {
      carregadoRef.current = cupomParam;
      setEditingCoupon(null);
      setFormData(getInitialFormData());
      setTentouSalvar(false);
      return;
    }

    const naLista = coupons.find((c) => c.id === cupomParam);
    if (naLista) {
      carregadoRef.current = cupomParam;
      setTentouSalvar(false);
      preencherFormulario(naLista);
      return;
    }

    // Link para um cupom que não está nesta página da lista (filtro, página 2):
    // busca o cupom em si, em vez de fingir que ele não existe.
    if (loading || buscandoRef.current === cupomParam) return;
    buscandoRef.current = cupomParam;
    couponsService
      .getCoupon(cupomParam)
      .then((c) => {
        if (buscandoRef.current !== cupomParam) return;
        carregadoRef.current = cupomParam;
        setTentouSalvar(false);
        preencherFormulario(c);
      })
      .catch(() => {
        // Apagado ou de outra loja: painel preso em "carregando" é pior que
        // fechar e deixar a lista.
        irParaCupom(null);
      })
      .finally(() => {
        buscandoRef.current = null;
      });
  }, [cupomParam, emCriacao, coupons, loading, getInitialFormData, preencherFormulario, irParaCupom]);

  /**
   * Diagnóstico da lista, com o cupom de cada linha anexado.
   *
   * A regra de cálculo mora em `insightsDeCupons` (pura e testada); aqui só se
   * amarra cada achado ao registro que ele acusa, para a linha virar navegação.
   */
  const insights = useMemo(
    () =>
      insightsDeCupons(coupons).map((i) => ({
        ...i,
        cupom:
          i.chave === 'campeao' || i.chave === 'limite'
            ? coupons.find((c) => i.titulo.includes(c.code) || i.valor.includes(c.code))
            : undefined,
      })),
    [coupons]
  );

  const erroDoCodigo = tentouSalvar && !formData.code ? 'Informe o código.' : null;
  const erroDoValor = tentouSalvar && !formData.discount_value ? 'Defina o valor do desconto.' : null;

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Selecione uma loja antes de criar um cupom');
      return;
    }

    // O cupom não existe sem código e sem valor.
    if (!formData.code || !formData.discount_value) {
      setTentouSalvar(true);
      toast.error(!formData.code ? 'O cupom precisa de um código.' : 'Defina o valor do desconto.');
      return;
    }

    try {
      setSaving(true);

      // Ensure store is always included
      const dataToSave = { ...formData, store: storeId };

      if (editingCoupon) {
        await couponsService.updateCoupon(editingCoupon.id, dataToSave as UpdateCoupon);
        toast.success('Cupom salvo');
      } else {
        await couponsService.createCoupon(dataToSave);
        toast.success('Cupom criado');
        // Criado: volta para a lista, onde o cupom novo já aparece. Editar
        // mantém o painel — quem ajusta um cupom costuma ajustar mais de um campo.
        irParaCupom(null);
      }
      loadCoupons();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar cupom';
      logger.error('Error saving coupon:', err);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await couponsService.toggleActive(coupon.id);
      toast.success(coupon.is_active ? 'Cupom desativado' : 'Cupom ativado');
      // O painel aberto mostra o cupom: sem refletir a troca ali, o switch
      // ficaria contando o contrário e um "Salvar" desfaria o toggle.
      if (cupomId === coupon.id) {
        setFormData((prev) => ({ ...prev, is_active: !coupon.is_active }));
      }
      loadCoupons();
    } catch (error) {
      logger.error('Error toggling coupon:', error);
      toast.error('Erro ao atualizar cupom');
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    const confirmado = await confirm({
      title: 'Excluir cupom',
      message: `Excluir o cupom ${coupon.code}? Não dá para desfazer.`,
      confirmText: 'Excluir',
      variant: 'danger',
    });
    if (!confirmado) return;
    try {
      setSaving(true);
      await couponsService.deleteCoupon(coupon.id);
      toast.success('Cupom excluído');
      if (cupomId === coupon.id) irParaCupom(null);
      loadCoupons();
    } catch (error) {
      logger.error('Error deleting coupon:', error);
      toast.error('Erro ao excluir cupom');
    } finally {
      setSaving(false);
    }
  };

  const divulgar = async (coupon: Coupon) => {
    const loja = stores.find((s) => s.id === storeId);
    const texto = textoDeDivulgacao(coupon, buildStorefrontUrl(loja));
    if (await copyToClipboard(texto)) toast.success('Texto copiado: cole no WhatsApp ou no Instagram');
    else toast.error('Não foi possível copiar');
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return formatCurrency(coupon.discount_value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading && coupons.length === 0) {
    return <Loading />;
  }

  const porcentagem = formData.discount_type === 'percentage';
  const painelPronto = emCriacao || Boolean(editingCoupon);

  return (
    <PageShell
      titulo="Cupons"
      acoes={
        <Button onClick={() => irParaCupom(NOVO)} className="w-full sm:w-auto">
          <PlusIcon className="w-5 h-5 mr-2" />
          Novo cupom
        </Button>
      }
    >
      {/* No celular o painel ocupa a tela: o que vem antes dele some, e o
          "Voltar" traz a lista de volta. No computador tudo fica à vista. */}
      <div className={cn('flex flex-col gap-5', painelAberto && 'max-lg:hidden')}>
        {/* Diagnóstico antes da tabela.
            Quatro números e uma lista não dizem o que fazer: "21 cupons ativos"
            tanto pode ser operação saudável quanto vinte cupons esquecidos. O
            que muda a semana é a frase, e cada linha leva ao cupom. */}
        <InsightList
          titulo="O que pede atenção"
          descricao="Calculado dos seus cupons ativos."
          tom="alerta"
          itens={insights.map((i) => ({
            direcao: i.direcao,
            titulo: i.titulo,
            valor: i.valor,
            recomendacao: i.recomendacao,
            // Diagnóstico que termina em texto morre ali: você teria que achar
            // o cupom na tabela por conta própria.
            acao: i.cupom
              ? { rotulo: 'Abrir cupom', onClick: () => irParaCupom(i.cupom!.id) }
              : undefined,
          }))}
        />

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-3 md:gap-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Ativos" value={stats.active} tone="success" />
            <StatCard label="Inativos" value={stats.inactive} />
            <StatCard label="Usos Totais" value={stats.total_usage} tone="brand" />
          </div>
        )}
      </div>

      {/* Lista à esquerda, painel à direita. Sem janela por cima: a lista
          continua à vista, então trocar de cupom é um clique, não fechar e
          abrir de novo. */}
      <div
        className={cn(
          'grid items-start gap-5',
          painelAberto ? 'lg:grid-cols-[minmax(0,1fr)_26rem]' : 'grid-cols-1',
        )}
      >
        <div className={cn('flex min-w-0 flex-col gap-5', painelAberto && 'max-lg:hidden')}>
          {/* Filters */}
          <Card className="p-3 md:p-4">
            <div className="flex flex-row max-sm:flex-col gap-3 md:gap-4">
              <div className="flex-1">
                <SearchInput
                  placeholder="Buscar por código…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
                <Select
                  rotuloOculto="Filtrar por status"
                  vazio="Todos os status"
                  valor={filterActive === undefined ? '' : String(filterActive)}
                  onMudar={(v) => setFilterActive(v === '' ? undefined : v === 'true')}
                  opcoes={[
                    { valor: 'true', rotulo: 'Ativos' },
                    { valor: 'false', rotulo: 'Inativos' },
                  ]}
                />
                <Select
                  rotuloOculto="Filtrar por tipo de desconto"
                  vazio="Todos os tipos"
                  valor={filterType}
                  onMudar={(v) => setFilterType(v as 'percentage' | 'fixed' | '')}
                  opcoes={TIPOS_DE_DESCONTO}
                />
              </div>
            </div>
          </Card>

          {/* Uma definição de coluna, duas apresentações: tabela no desktop,
              cartão no celular. Antes eram duas listas escritas à mão no mesmo
              arquivo — e elas JÁ divergiam. */}
          <Tabela<Coupon>
            itens={coupons}
            chave={(c) => c.id}
            rotuloDaLinha={(c) => `Abrir cupom ${c.code}`}
            onAbrir={(c) => irParaCupom(c.id)}
            classeDaLinha={(c) => (c.id === cupomId ? 'bg-brand-soft' : '')}
            carregando={loading}
            falhou={falhou}
            falha={{ titulo: 'Não foi possível carregar os cupons' }}
            onTentarDeNovo={loadCoupons}
            vazio={{
              titulo: 'Nenhum cupom encontrado',
              descricao: 'Comece criando um cupom de desconto.',
              icone: <TagIcon className="h-12 w-12" />,
              acao: (
                <Button onClick={() => irParaCupom(NOVO)}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Novo cupom
                </Button>
              ),
            }}
            paginacao={{ pagina: page, porPagina: POR_PAGINA, total, onPagina: setPage, rotulo: 'cupons' }}
            colunas={[
              {
                chave: 'code',
                cabecalho: 'Código',
                render: (c) => (
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-5 h-5 shrink-0 text-fg-muted-token" />
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-fg-token">{c.code}</div>
                      {c.description && (
                        <div className="truncate text-sm text-fg-muted-token">{c.description}</div>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                chave: 'desconto',
                cabecalho: 'Desconto',
                render: (c) => (
                  <Badge variant={c.discount_type === 'percentage' ? 'info' : 'success'}>
                    {formatDiscount(c)}
                  </Badge>
                ),
              },
              {
                chave: 'minimo',
                cabecalho: 'Mín. compra',
                // Com o painel aberto a lista divide a tela: o que não decide
                // a escolha do cupom sai (e está no painel).
                classe: painelAberto ? 'hidden' : undefined,
                render: (c) =>
                  Number(c.min_purchase || 0) > 0 ? formatCurrency(c.min_purchase) : '—',
              },
              {
                chave: 'uso',
                cabecalho: 'Uso',
                render: (c) => `${c.used_count}${c.usage_limit ?` / ${c.usage_limit}` : ''}`,
              },
              {
                chave: 'validade',
                cabecalho: 'Validade',
                soNoDesktop: true,
                classe: painelAberto ? 'hidden' : undefined,
                render: (c) => (
                  <>
                    <div>{formatDate(c.valid_from)}</div>
                    <div className="text-xs text-fg-muted-token">até {formatDate(c.valid_until)}</div>
                  </>
                ),
              },
              {
                chave: 'status',
                cabecalho: 'Status',
                render: (c) => {
                  const estado = estadoDeCupom(c.is_active, c.is_valid_now);
                  return <SeloDeEstado tone={estado.tone}>{estado.rotulo}</SeloDeEstado>;
                },
              },
              {
                chave: 'acoes',
                cabecalho: 'Ações',
                alinhamento: 'direita',
                render: (c) => (
                  // Um kebab no lugar de ícones nus: "Excluir" em texto deixa de
                  // ser adivinhação de pictograma, e o destrutivo sai de perto do
                  // dedo — antes ficava colado no lápis, onde a mão cai ao rolar.
                  <RowActions
                    rotulo={`Ações do cupom ${c.code}`}
                    acoes={[
                      {
                        rotulo: 'Editar',
                        icone: <PencilIcon className="h-4 w-4" />,
                        onClick: () => irParaCupom(c.id),
                      },
                      {
                        rotulo: 'Copiar divulgação',
                        icone: <MegaphoneIcon className="h-4 w-4" />,
                        onClick: () => divulgar(c),
                      },
                      {
                        rotulo: c.is_active ? 'Desativar' : 'Ativar',
                        onClick: () => handleToggleActive(c),
                      },
                      {
                        rotulo: 'Excluir',
                        icone: <TrashIcon className="h-4 w-4" />,
                        destrutiva: true,
                        onClick: () => handleDelete(c),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>

        {painelAberto && (
          <aside
            aria-label={
              emCriacao ? 'Novo cupom' : editingCoupon ? `Editar cupom ${editingCoupon.code}` : 'Carregando cupom'
            }
            aria-busy={!painelPronto}
            // Sticky só no computador: no celular o painel é a tela inteira e
            // rola com ela. `max-h` + overflow mantém o botão alcançável num
            // formulário mais alto que a janela.
            className="superficie flex min-w-0 flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border-token px-5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
                  onClick={() => irParaCupom(null)}
                >
                  Voltar
                </Button>
                <h2 className="truncate text-base font-semibold text-fg-token">
                  {emCriacao ? 'Novo cupom' : 'Editar cupom'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar painel"
                title="Fechar"
                onClick={() => irParaCupom(null)}
                className="max-lg:hidden rounded p-1 text-fg-muted-token hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </header>

            {!painelPronto ? (
              <div className="flex flex-col gap-3 p-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </div>
            ) : (
              <div className="flex flex-col gap-6 p-5">
                <Secao titulo="Benefício" plana>
                  <div className="flex flex-col gap-4">
                    <div>
                      <Campo rotulo="Código" obrigatorio erro={erroDoCodigo}>
                        <Input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="Ex: DESCONTO10"
                          className="font-mono"
                        />
                      </Campo>
                      {/* Sugestões que PREENCHEM. Campo de código é página em
                          branco: o lojista trava escolhendo nome, e o nome não
                          importa tanto quanto existir um cupom no ar.
                          Só aparecem com o campo vazio — depois de digitar,
                          virariam botões que apagam o que você escreveu. */}
                      {!formData.code && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-caption text-fg-muted-token">Sugestões:</span>
                          {SUGESTOES_DE_CODIGO.map((sugestao) => (
                            <button
                              key={sugestao}
                              type="button"
                              onClick={() => setFormData({ ...formData, code: sugestao })}
                              className="rounded-pill border border-border-token px-2.5 py-1 font-mono text-badge font-semibold text-fg-muted-token transition-colors hover:border-brand hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              {sugestao}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Campo rotulo="Descrição">
                      <Input
                        type="text"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição do cupom"
                      />
                    </Campo>

                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      <Select
                        rotulo="Tipo de desconto"
                        valor={formData.discount_type}
                        onMudar={(v) => setFormData({ ...formData, discount_type: v as 'percentage' | 'fixed' })}
                        opcoes={TIPOS_DE_DESCONTO}
                      />
                      {porcentagem ? (
                        <Campo rotulo="Valor do desconto" obrigatorio erro={erroDoValor}>
                          <Input
                            type="number"
                            rightAddon="%"
                            value={formData.discount_value || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })
                            }
                            min="0"
                            step="1"
                          />
                        </Campo>
                      ) : (
                        <CampoDeDinheiro
                          rotulo="Valor do desconto"
                          obrigatorio
                          erro={erroDoValor}
                          valor={formData.discount_value || null}
                          onMudar={(v) => setFormData({ ...formData, discount_value: v ?? 0 })}
                        />
                      )}
                    </div>
                  </div>
                </Secao>

                <Secao titulo="Regras" plana>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      <CampoDeDinheiro
                        rotulo="Compra mínima"
                        valor={formData.min_purchase || null}
                        onMudar={(v) => setFormData({ ...formData, min_purchase: v ?? 0 })}
                      />
                      <CampoDeDinheiro
                        rotulo="Desconto máximo"
                        dica="Vazio = sem limite"
                        valor={formData.max_discount ?? null}
                        onMudar={(v) => setFormData({ ...formData, max_discount: v })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      <Campo rotulo="Limite de uso (total)">
                        <Input
                          type="number"
                          value={formData.usage_limit || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : null })
                          }
                          min="0"
                          placeholder="Sem limite"
                        />
                      </Campo>
                      <Campo rotulo="Limite por cliente">
                        <Input
                          type="number"
                          value={formData.usage_limit_per_user || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              usage_limit_per_user: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          min="0"
                          placeholder="Sem limite"
                        />
                      </Campo>
                    </div>

                    {categories.length > 0 && (
                      <div role="group" aria-labelledby="cupom-categorias" className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span id="cupom-categorias" className="text-sm font-medium text-fg-token">
                            Categorias
                          </span>
                          <span className="text-xs text-fg-muted-token">Vazio = pedido inteiro</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {categories.map((cat) => {
                            const active = (formData.applicable_categories ?? []).includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                aria-pressed={active}
                                className={cn(
                                  'rounded-pill border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                                  active
                                    ? 'border-brand bg-brand text-on-brand'
                                    : 'border-border-token text-fg-token hover:border-brand',
                                )}
                              >
                                {cat.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Secao>

                <Secao titulo="Alcance" plana>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      <Campo rotulo="Válido a partir de" obrigatorio>
                        <Input
                          type="date"
                          value={formData.valid_from}
                          onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                        />
                      </Campo>
                      <Campo rotulo="Válido até" obrigatorio>
                        <Input
                          type="date"
                          value={formData.valid_until}
                          onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                        />
                      </Campo>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-fg-token">Só primeira compra do cliente</span>
                      <Switch
                        rotulo="Só primeira compra do cliente"
                        ligado={formData.first_order_only ?? false}
                        onMudar={(ligado) => setFormData({ ...formData, first_order_only: ligado })}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-fg-token">Cupom ativo</span>
                      <Switch
                        rotulo="Cupom ativo"
                        ligado={formData.is_active ?? true}
                        onMudar={(ligado) => setFormData({ ...formData, is_active: ligado })}
                      />
                    </div>
                  </div>
                </Secao>

                {/* Parceria. Fica junto porque é uma propriedade DO CUPOM, e
                    separar numa aba esconderia o que o dono precisa conferir
                    na hora de criar: quem ganha, e quanto. Vazio = cupom
                    comum da loja. */}
                <Secao titulo="Parceria" plana>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      <CampoDeTelefone
                        rotulo="Celular do parceiro"
                        valor={formData.parceiro_phone ?? ''}
                        onMudar={(v) => setFormData({ ...formData, parceiro_phone: v })}
                      />
                      <Campo rotulo="Comissão dele" dica="Vazio = taxa da loja">
                        <Input
                          type="number"
                          rightAddon="%"
                          value={formData.parceiro_percent ?? ''}
                          onChange={(e) => setFormData({ ...formData, parceiro_percent: e.target.value })}
                          min="0"
                          max="100"
                        />
                      </Campo>
                    </div>
                    {/* O exemplo em dinheiro é o ponto: "3%" é abstrato, "R$ 2,16
                        num pedido de R$ 72" é a decisão que o dono está tomando. */}
                    {formData.parceiro_phone && (
                      <p className="text-caption text-fg-muted-token">
                        Em R$ 72, o parceiro ganha{' '}
                        <strong className="text-fg-token">
                          {formatCurrency((72 * (Number(formData.parceiro_percent) || 0)) / 100)}
                        </strong>
                      </p>
                    )}
                  </div>
                </Secao>

                {/* Um botão principal, com verbo + objeto. Excluir é ação à
                    parte, só de cupom que já existe. */}
                <div className="flex flex-col gap-2">
                  <Button onClick={handleSave} isLoading={saving} fullWidth>
                    {editingCoupon ? 'Salvar cupom' : 'Criar cupom'}
                  </Button>
                  {editingCoupon && (
                    <Button
                      variant="danger"
                      fullWidth
                      isDisabled={saving}
                      leftIcon={<TrashIcon className="h-4 w-4" />}
                      onClick={() => handleDelete(editingCoupon)}
                    >
                      Excluir cupom
                    </Button>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {ConfirmDialog}
    </PageShell>
  );
};

export default CouponsPage;
