import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import logger from '../../services/logger';
import { formatCurrency } from '../../utils/formatters';
import { PageShell } from '../../components/ui';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Input, Badge, Modal, Loading } from '../../components/common';
import { StatCard, RowActions, FormStepper, InsightList, Tabela, SearchInput, Select } from '../../components/ui';
import { insightsDeCupons } from './insightsDeCupons';
import { couponsService, Coupon, CreateCoupon, UpdateCoupon, CouponStats } from '../../services/coupons';
import { getCategories, StoreCategory } from '../../services/storesApi';
import { useStore } from '../../hooks';

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

export const CouponsPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();

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
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [filterType, setFilterType] = useState<'percentage' | 'fixed' | ''>('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      logger.error('Error loading coupons:', err);
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

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
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
    } else {
      setEditingCoupon(null);
      setFormData(getInitialFormData());
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Selecione uma loja antes de criar um cupom');
      return;
    }

    try {
      setSaving(true);
      
      // Ensure store is always included
      const dataToSave = { ...formData, store: storeId };
      
      if (editingCoupon) {
        await couponsService.updateCoupon(editingCoupon.id, dataToSave as UpdateCoupon);
      } else {
        await couponsService.createCoupon(dataToSave);
      }
      handleCloseModal();
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
      loadCoupons();
    } catch (error) {
      logger.error('Error toggling coupon:', error);
      toast.error('Erro ao atualizar cupom');
    }
  };

  const handleDelete = async () => {
    if (!deletingCoupon) return;
    try {
      setSaving(true);
      await couponsService.deleteCoupon(deletingCoupon.id);
      toast.success('Cupom excluído');
      setIsDeleteModalOpen(false);
      setDeletingCoupon(null);
      loadCoupons();
    } catch (error) {
      logger.error('Error deleting coupon:', error);
      toast.error('Erro ao excluir cupom');
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (value: number | string | null | undefined) => {
    const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
    if (Number.isNaN(numeric)) return '0.00';
    return numeric.toFixed(2);
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return `R$ ${formatMoney(coupon.discount_value)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading && coupons.length === 0) {
    return <Loading />;
  }

  return (
    <PageShell
      titulo="Cupons"
      acoes={
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <PlusIcon className="w-5 h-5 mr-2" />
          Novo cupom
        </Button>
      }
    >

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
            ? { rotulo: 'Abrir cupom', onClick: () => handleOpenModal(i.cupom!) }
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
              opcoes={[
                { valor: 'percentage', rotulo: 'Porcentagem (%)' },
                { valor: 'fixed', rotulo: 'Valor fixo (R$)' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Uma definição de coluna, duas apresentações: tabela no desktop,
          cartão no celular. Antes eram duas listas escritas à mão no mesmo
          arquivo — e elas JÁ divergiam: o cartão mostrava "Mín." e a tabela
          "Mín. Compra", o cartão tinha dois ícones nus e a tabela um kebab. */}
      <Tabela<Coupon>
        itens={coupons}
        chave={(c) => c.id}
        rotuloDaLinha={(c) => `Abrir cupom ${c.code}`}
        onAbrir={(c) => handleOpenModal(c)}
        carregando={loading}
        vazio={{
          titulo: 'Nenhum cupom encontrado',
          descricao: 'Comece criando um cupom de desconto.',
          icone: <TagIcon className="h-12 w-12" />,
          acao: (
            <Button onClick={() => handleOpenModal()}>
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
            render: (c) =>
              Number(c.min_purchase || 0) > 0 ? `R$ ${formatMoney(c.min_purchase)}` : '—',
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
            render: (c) => (
              <button
                type="button"
                // A linha abre a edição; alternar o status aqui não pode
                // arrastar o usuário para o modal junto.
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleActive(c);
                }}
                className="focus:outline-none"
              >
                <Badge variant={c.is_active && c.is_valid_now ? 'success' : 'danger'}>
                  {c.is_active ? (c.is_valid_now ? 'Ativo' : 'Expirado') : 'Inativo'}
                </Badge>
              </button>
            ),
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
                    onClick: () => handleOpenModal(c),
                  },
                  {
                    rotulo: c.is_active ? 'Desativar' : 'Ativar',
                    onClick: () => handleToggleActive(c),
                  },
                  {
                    rotulo: 'Excluir',
                    icone: <TrashIcon className="h-4 w-4" />,
                    destrutiva: true,
                    onClick: () => {
                      setDeletingCoupon(c);
                      setIsDeleteModalOpen(true);
                    },
                  },
                ]}
              />
            ),
          },
        ]}
      />


      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
      >
        <FormStepper
          passos={[
            { id: 'beneficio', rotulo: 'Benefício', icone: TagIcon, pendente: !formData.code || !formData.discount_value },
            { id: 'regras', rotulo: 'Regras', icone: AdjustmentsHorizontalIcon },
            { id: 'alcance', rotulo: 'Alcance', icone: UserGroupIcon },
          ]}
          onCancelar={handleCloseModal}
          onConcluir={handleSave}
          concluindo={saving}
          rotuloConcluir={editingCoupon ? 'Salvar cupom' : 'Criar cupom'}
          // Segura no primeiro passo enquanto faltar código ou valor: sem os
          // dois o cupom não existe, e descobrir isso no terceiro passo obriga
          // a voltar depois de já ter preenchido tudo.
          podeAvancar={(passo) => {
            if (passo !== 'beneficio') return true;
            if (!formData.code) { toast.error('O cupom precisa de um código.'); return false; }
            if (!formData.discount_value) { toast.error('Defina o valor do desconto.'); return false; }
            return true;
          }}
        >
        {(passo) => (
        <div className="space-y-4">
          {passo === 'beneficio' && (
            <>
          <div>
            <label
              htmlFor="cupom-codigo"
              className="mb-1 block text-body font-medium text-fg-token"
            >
              Código do cupom <span className="text-[var(--danger)]">*</span>
            </label>
            <Input
              id="cupom-codigo"
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="Ex: DESCONTO10"
              className="font-mono"
            />
            {/* Sugestões que PREENCHEM. Campo de código é página em branco: o
                lojista trava escolhendo nome, e o nome não importa tanto quanto
                existir um cupom no ar. Um clique resolve.
                Só aparecem com o campo vazio — depois de digitar, virariam
                botões que apagam o que você escreveu. */}
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
            <p className="mt-1.5 text-caption text-fg-muted-token">
              É isto que o cliente digita no carrinho. Curto e fácil de ditar no WhatsApp.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-token mb-1">
              Descrição
            </label>
            <Input
              type="text"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do cupom"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select
                rotuloOculto="Tipo de desconto"
                valor={formData.discount_type}
                onMudar={(v) => setFormData({ ...formData, discount_type: v as 'percentage' | 'fixed' })}
                opcoes={[
                  { valor: 'percentage', rotulo: 'Porcentagem (%)' },
                  { valor: 'fixed', rotulo: 'Valor fixo (R$)' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token mb-1">
                Valor do Desconto *
              </label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                min="0"
                step={formData.discount_type === 'percentage' ? '1' : '0.01'}
              />
            </div>
          </div>
            </>
          )}

          {passo === 'regras' && (
            <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-token mb-1">
                Compra Mínima (R$)
              </label>
              <Input
                type="number"
                value={formData.min_purchase || 0}
                onChange={(e) => setFormData({ ...formData, min_purchase: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token mb-1">
                Desconto Máximo (R$)
              </label>
              <Input
                type="number"
                value={formData.max_discount || ''}
                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseFloat(e.target.value) : null })}
                min="0"
                step="0.01"
                placeholder="Sem limite"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-token mb-1">
                Limite de Uso (total)
              </label>
              <Input
                type="number"
                value={formData.usage_limit || ''}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                min="0"
                placeholder="Sem limite"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token mb-1">
                Limite por cliente
              </label>
              <Input
                type="number"
                value={formData.usage_limit_per_user || ''}
                onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value ? parseInt(e.target.value) : null })}
                min="0"
                placeholder="Sem limite"
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-fg-token mb-1">
                Vale só nestas categorias <span className="opacity-60 font-normal">(vazio = pedido inteiro)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const active = (formData.applicable_categories ?? []).includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      aria-pressed={active}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        active
                          ? 'bg-brand text-on-brand border-brand'
                          : 'border-border-token text-fg-token hover:border-brand'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
            </>
          )}

          {passo === 'alcance' && (
            <>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="first_order_only"
              checked={formData.first_order_only ?? false}
              onChange={(e) => setFormData({ ...formData, first_order_only: e.target.checked })}
              className="h-4 w-4 text-brand-ink focus:ring-brand border-border-token rounded"
            />
            <label htmlFor="first_order_only" className="ml-2 block text-sm text-fg-token">
              Só primeira compra do cliente
            </label>
          </div>

          {/* Parceria. Fica junto porque é uma propriedade DO CUPOM, e separar
              numa aba esconderia o que o dono precisa conferir na hora de
              criar: quem ganha, e quanto. Vazio = cupom comum da loja. */}
          <div className="rounded border border-border-token bg-surface-2 p-3">
            <p className="text-sm font-semibold text-fg-token">Parceria (opcional)</p>
            <p className="mt-0.5 text-caption text-fg-muted-token">
              Vincule alguém que divulga este cupom — uma academia, um
              influenciador, um vizinho. A cada venda com o código, essa pessoa
              ganha saldo na loja.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Celular do parceiro
                </label>
                <Input
                  value={formData.parceiro_phone ?? ''}
                  onChange={(e) => setFormData({ ...formData, parceiro_phone: e.target.value })}
                  placeholder="(63) 99999-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Comissão dele (%)
                </label>
                <Input
                  type="number"
                  value={formData.parceiro_percent ?? ''}
                  onChange={(e) => setFormData({ ...formData, parceiro_percent: e.target.value })}
                  min="0"
                  max="100"
                  placeholder="Taxa padrão da loja"
                />
              </div>
            </div>
            {/* O exemplo em dinheiro é o ponto: "3%" é abstrato, "R$ 2,16 num
                pedido de R$ 72" é a decisão que o dono está tomando. */}
            {formData.parceiro_phone && (
              <p className="mt-2 text-caption text-fg-muted-token">
                Num pedido de R$ 72 com este cupom, o parceiro ganha{''}
                <strong className="text-fg-token">
                  {formatCurrency(72 * (Number(formData.parceiro_percent) || 0) / 100)}
                </strong>
                {!formData.parceiro_percent && '— usando a taxa padrão da loja'}.
                A comissão sai do valor da comida, sem a entrega e já com o
                desconto do cupom aplicado.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-token mb-1">
                Válido a partir de *
              </label>
              <Input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token mb-1">
                Válido até *
              </label>
              <Input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-brand-ink focus:ring-brand border-border-token rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-fg-token">
              Cupom ativo
            </label>
          </div>
            </>
          )}
        </div>
        )}
        </FormStepper>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingCoupon(null);
        }}
        title="Excluir Cupom"
      >
        <div className="space-y-4">
          <p className="text-fg-muted-token">
            Tem certeza que deseja excluir o cupom <strong>{deletingCoupon?.code}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingCoupon(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
};

export default CouponsPage;
