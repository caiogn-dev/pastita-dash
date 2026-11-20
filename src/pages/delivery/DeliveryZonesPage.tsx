import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ComoOClienteRecebe } from './ComoOClienteRecebe';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import logger from '../../services/logger';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Input, Modal, Loading } from '../../components/common';
import { Button, Badge, PageShell, PageTabs, RowActions, Tabela, SearchInput, type PageTab } from '../../components/ui';
import DeliveryZonesMap, { COR_DA_PROMO, COR_DO_LIMITE, corDoAnel } from '../../components/maps/DeliveryZonesMap';
import { zonasParaCirculos } from '../../components/maps/zonasParaCirculos';
import {
  deliveryService,
  DeliveryZone,
  CreateDeliveryZone,
  UpdateDeliveryZone,
  DeliveryZoneStats,
  StoreLocation,
} from '../../services/delivery';
import { useStore } from '../../hooks';
import { ZonasDePrecoFixoCard, type CategoriaDaLoja } from './ZonasDePrecoFixoCard';
import { FormulaDeEntregaCard, lerFormula } from './FormulaDeEntregaCard';
import type { FormulaDeEntrega } from './precoDaEntrega';
import { FreteGratisCard } from './FreteGratisCard';
import { SimuladorDeFreteCard } from './SimuladorDeFreteCard';
import { anelDaPromo, lerPromo, type PromoDeFrete } from './freteGratis';
import { getCategories, getStore, updateStore } from '../../services/storesApi';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const formatKm = (value?: number | string | null) => {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  // "2,5" e não "2.50": número de lojista brasileiro (auditoria 20/10).
  return formatNumber(Number.isFinite(numeric) ? numeric : 0, { maximumFractionDigits: 2 });
};

const DISTANCE_BANDS = [
  { value: '0_2', label: '0 - 2 km' },
  { value: '2_5', label: '2 - 5 km' },
  { value: '5_8', label: '5 - 8 km' },
  { value: '8_12', label: '8 - 12 km' },
  { value: '12_15', label: '12 - 15 km' },
  { value: '15_20', label: '15 - 20 km' },
];

/** Esquece o rascunho quando a aba sai da tela (o cartão desmonta sem salvar). */
const AoSair: React.FC<{ onSair: () => void; children: React.ReactNode }> = ({ onSair, children }) => {
  const ref = useRef(onSair);
  ref.current = onSair;
  useEffect(() => () => ref.current(), []);
  return <>{children}</>;
};


export const DeliveryZonesPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();

  const storeId = useMemo(() => {
    if (!routeStoreId) return contextStoreId || null;
    const match = stores.find(s => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || contextStoreId || null;
  }, [routeStoreId, contextStoreId, stores]);
  const settingsPath = storeId ? `/stores/${storeId}/settings` : '/settings';
  const storeSlug = stores.find((s) => s.id === storeId)?.slug ?? null;
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [stats, setStats] = useState<DeliveryZoneStats | null>(null);
  const [storeLocation, setStoreLocation] = useState<StoreLocation | null>(null);
  // Metadata completo da loja: as zonas de preço fixo moram nele, e a tela
  // precisa reenviar o resto intacto ao salvar — um PATCH com metadata parcial
  // apagaria coordenadas, fidelidade e configuração de entrega.
  const [storeMetadata, setStoreMetadata] = useState<Record<string, unknown> | undefined>();
  const [locationError, setLocationError] = useState<string | null>(null);
  // Falha ao CARREGAR as faixas — some da tela no retry. Separada do erro de
  // salvar (que vai por toast): se fosse a mesma, um save que cai apagaria as
  // faixas já carregadas e trocaria "não salvou" por "não carregou".
  const [erroAoCarregar, setErroAoCarregar] = useState(false);

  const [loading, setLoading] = useState(true);
  // Sequência da busca de faixas: trocar `search`/`filterActive` recria o
  // `loadData` e dispara outra busca com uma ainda em voo (e o StrictMode monta
  // o efeito duas vezes). Só a mais recente pode escrever na tela.
  const requisicaoRef = useRef(0);
  const [search, setSearch] = useState('');
  const [filterActive] = useState<boolean | undefined>(undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [deletingZone, setDeletingZone] = useState<DeliveryZone | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreateDeliveryZone>({
    store: storeId || undefined,
    name: '',
    distance_band: '',
    delivery_fee: 0,
    estimated_days: 1,
    is_active: true,
  });

  // As coordenadas da loja são a fonte da verdade do mapa.
  //
  // O código antigo montava uma URL de EMBED que BUSCAVA PELO NOME da loja no
  // Google, e só caía nas coordenadas se não houvesse nome — ou seja, nunca.
  // Loja que não está cadastrada no Google Maps (a maioria) abria num lugar
  // errado ou em lugar nenhum, mesmo com latitude e longitude no banco.
  // Mesma fonte que o mapa usa para desenhar — legenda e desenho não podem
  // divergir, senão a cor da legenda aponta para o anel errado.
  const circulosDoMapa = useMemo(() => zonasParaCirculos(zones), [zones]);

  // O anel da promoção sai do MESMO metadata que o card de frete grátis
  // edita: salvar no card redesenha o mapa sem recarregar a tela.
  // Rascunho dos cartões (20/11): o mapa e o resumo mudam a cada tecla, não
  // só depois de salvar — "não está atualizando de forma dinâmica".
  const [rascunhoFormula, setRascunhoFormula] = useState<FormulaDeEntrega | null>(null);
  const [rascunhoPromo, setRascunhoPromo] = useState<PromoDeFrete | null>(null);
  useEffect(() => { setRascunhoFormula(null); setRascunhoPromo(null); }, [storeMetadata]);
  const formula = rascunhoFormula ?? lerFormula(storeMetadata ?? {});
  const promo = rascunhoPromo ?? lerPromo(storeMetadata ?? {});
  const anelPromo = useMemo(() => anelDaPromo(promo), [promo]);
  const anelLimite = useMemo(
    () => (formula.raioMaximoKm > 0 ? { raioMetros: formula.raioMaximoKm * 1000 } : null),
    [formula.raioMaximoKm],
  );

  /**
   * Cor do anel de uma faixa, para casar tabela e mapa.
   *
   * Faixa que não vira anel (sem km) fica cinza: pintá-la com uma cor da
   * paleta prometeria um anel que não existe no desenho.
   */
  const corDaFaixa = useCallback(
    (zoneId: string): React.CSSProperties => {
      const i = circulosDoMapa.findIndex((c) => c.id === String(zoneId));
      if (i < 0) return { borderColor: 'var(--border)', background: 'transparent' };
      const cor = corDoAnel(i);
      return { borderColor: cor, background: `${cor}33` };
    },
    [circulosDoMapa],
  );

  const temCoordenadas =
    Number.isFinite(Number(storeLocation?.latitude)) &&
    Number.isFinite(Number(storeLocation?.longitude));

  const loadData = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    const req = ++requisicaoRef.current;
    try {
      setLoading(true);
      setErroAoCarregar(false);
      // allSettled e não all: a localização falhar não pode apagar as faixas
      // da tela. Elas são o conteúdo principal, e continuam valendo para o
      // cálculo de frete mesmo sem mapa.
      const [zonesRes, statsRes, storeRes, lojaRes] = await Promise.allSettled([
        deliveryService.getZones({
          store: storeId,
          search: search || undefined,
          is_active: filterActive,
        }),
        deliveryService.getStats(storeId),
        deliveryService.getStoreLocation(),
        // O metadata completo, para ler as zonas de preço fixo e devolver o
        // resto intacto no save.
        getStore(storeId),
      ]);

      if (req !== requisicaoRef.current) return; // busca superada por uma mais nova
      if (zonesRes.status === 'rejected') throw zonesRes.reason;
      setZones(zonesRes.value.results);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);

      if (lojaRes.status === 'fulfilled') {
        setStoreMetadata((lojaRes.value.metadata ?? {}) as Record<string, unknown>);
      }

      if (storeRes.status === 'fulfilled') {
        setStoreLocation(storeRes.value);
        setLocationError(null);
      } else {
        // Distinguir os dois casos: `null` é "loja sem endereço cadastrado" e
        // pede "Configurar Localização"; exceção é falha nossa e precisa dizer
        // isso, senão mandamos o dono cadastrar o que já está cadastrado.
        logger.error('Falha ao carregar a localização da loja', storeRes.reason);
        setStoreLocation(null);
        setLocationError('Não foi possível carregar a localização desta loja.');
      }
    } catch (err) {
      if (req !== requisicaoRef.current) return; // rejeição obsoleta: ignora
      logger.error('Error loading delivery zones:', err);
      setErroAoCarregar(true);
    } finally {
      if (req === requisicaoRef.current) setLoading(false);
    }
  }, [search, filterActive, storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Categorias para as regras de região (o que vai a Paraíso/Porto).
  const [categoriasDaLoja, setCategoriasDaLoja] = useState<CategoriaDaLoja[]>([]);
  useEffect(() => {
    if (!storeId) return;
    let vivo = true;
    getCategories(storeId)
      .then((r) => {
        if (vivo) setCategoriasDaLoja((r.results ?? []).map((c) => ({ id: String(c.id), name: c.name })));
      })
      .catch(() => { /* sem categorias o cartão só não mostra o filtro */ });
    return () => { vivo = false; };
  }, [storeId]);

  // Update form data when store changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, store: storeId || undefined }));
  }, [storeId]);

  const handleOpenModal = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        distance_band: zone.distance_band || '',
        delivery_fee: zone.delivery_fee,
        estimated_days: zone.estimated_days,
        is_active: zone.is_active,
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        distance_band: '',
        delivery_fee: 0,
        estimated_days: 1,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingZone(null);
  };

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Selecione uma loja antes de criar uma zona de entrega');
      return;
    }

    try {
      setSaving(true);

      if (editingZone) {
        const payload: UpdateDeliveryZone = {
          ...formData,
          store: storeId,
          name: formData.name.trim(),
          distance_band: formData.distance_band,
        };
        await deliveryService.updateZone(editingZone.id, payload);
      } else {
        const payload: CreateDeliveryZone = {
          ...formData,
          store: storeId,
          name: formData.name.trim(),
        };
        await deliveryService.createZone(payload);
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      logger.error('Error saving delivery zone:', err);
      toast.error('Erro ao salvar zona de entrega');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (zone: DeliveryZone) => {
    try {
      await deliveryService.toggleActive(zone.id);
      toast.success(zone.is_active ? 'Zona desativada' : 'Zona ativada');
      loadData();
    } catch (error) {
      logger.error('Error toggling zone:', error);
      toast.error('Erro ao atualizar zona de entrega');
    }
  };

  const handleDelete = async () => {
    if (!deletingZone) return;
    try {
      setSaving(true);
      await deliveryService.deleteZone(deletingZone.id);
      toast.success('Zona de entrega excluída');
      setIsDeleteModalOpen(false);
      setDeletingZone(null);
      loadData();
    } catch (error) {
      logger.error('Error deleting zone:', error);
      toast.error('Erro ao excluir zona de entrega');
    } finally {
      setSaving(false);
    }
  };

  if (loading && zones.length === 0) {
    return <Loading />;
  }

  // Faixas por km passam por cima da fórmula, e nenhuma loja usava (0 de 9 em
  // 26/10). A seção só aparece para quem tem faixa — ou está procurando uma.
  const temFaixas =
    zones.length > 0 || (stats?.total ?? 0) > 0 || Boolean(search) ||
    filterActive !== undefined || erroAoCarregar;

  const salvarMetadata = async (novoMetadata: Record<string, unknown>) => {
    if (!storeId) return;
    await updateStore(storeId, { metadata: novoMetadata });
    setStoreMetadata(novoMetadata);
  };

  const abas: PageTab[] = [
    ...(temFaixas ? [{ id: 'faixas', rotulo: 'Faixas' }] : []),
    { id: 'preco', rotulo: 'Preço' },
    { id: 'gratis', rotulo: 'Grátis' },
    { id: 'excecoes', rotulo: 'Exceções' },
    { id: 'prazo', rotulo: 'Prazo' },
    { id: 'simular', rotulo: 'Simular' },
  ];

  const resumo = [
    { rotulo: 'Raio máximo', valor: `${formatNumber(formula.raioMaximoKm)} km` },
    { rotulo: 'Taxa base', valor: formatCurrency(formula.taxaBase) },
    { rotulo: 'Grátis até', valor: promo.ativo && promo.ateKm ? `${formatNumber(promo.ateKm)} km` : '—' },
  ];

  return (
    <PageShell titulo="Entrega">
      {/* Molde Prefiro (20/11, 2ª volta): o MAPA é a tela; a configuração é
          UM painel por cima dele, com rolagem própria. Antes eram 4 cartões
          empilhados ao lado de um mapa menor que eles — "bloco jogado". */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-border-token lg:h-[calc(100vh-170px)] lg:min-h-[600px]">
        <div className="h-72 lg:absolute lg:inset-0 lg:h-full">
          {storeLocation && temCoordenadas ? (
            <DeliveryZonesMap storeLocation={storeLocation} zones={zones} promo={anelPromo} limite={anelLimite} height="100%" />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div>
                {locationError ? (
                  <ExclamationTriangleIcon className="mx-auto mb-2 h-8 w-8 text-[var(--warning)]" />
                ) : (
                  <MapPinIcon className="mx-auto mb-2 h-8 w-8 text-fg-muted-token" />
                )}
                <p className="text-sm font-semibold text-fg-token">{locationError || 'Sem localização da loja'}</p>
                {locationError ? (
                  <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>Tentar novamente</Button>
                ) : (
                  <Link to={settingsPath} className="mt-3 inline-block text-sm font-semibold text-brand-ink hover:underline">
                    Definir a localização
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legenda flutuante no canto do mapa. */}
        <div className="pointer-events-none hidden lg:absolute lg:right-4 lg:top-4 lg:block">
          <div className="pointer-events-auto superficie px-3 py-2.5 shadow-lg">
                    {(circulosDoMapa.length > 0 || anelPromo || anelLimite) && (
              <ul className="flex flex-col gap-1.5">
                {/* A promoção encabeça a legenda: ela SOBRESCREVE o preço
                    das faixas dentro dela.

                    O anel é um CÍRCULO e a regra é de ROTA — 3 km de rua
                    cobrem menos chão que 3 km de reta. O rótulo diz isso
                    em vez de o mapa prometer área que a cotação não honra. */}
                {anelPromo && (
                  <li className="flex items-center gap-1.5 text-caption">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-dashed"
                      style={{ borderColor: COR_DA_PROMO }}
                    />
                    <span className="font-semibold" style={{ color: COR_DA_PROMO }}>
                      {anelPromo.rotulo}
                    </span>
                  </li>
                )}
                {anelLimite && (
                  <li className="flex items-center gap-1.5 text-caption">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full border-2" style={{ borderColor: COR_DO_LIMITE }} />
                    <span className="font-semibold text-fg-token">Entrega até {formatNumber(formula.raioMaximoKm)} km</span>
                  </li>
                )}
                {circulosDoMapa.map((c, i) => {
                  const zona = zones.find((z) => String(z.id) === c.id);
                  return (
                    <li key={c.id} className="flex items-center gap-1.5 text-caption">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                        style={{
                          borderColor: corDoAnel(i),
                          background: c.aberta ? 'transparent' : `${corDoAnel(i)}33`,
                        }}
                      />
                      <span className="font-semibold text-fg-token">{c.nome}</span>
                      {zona && (
                        <span className="tabular-nums text-fg-muted-token">
                          {formatCurrency(zona.delivery_fee)}
                        </span>
                      )}
                      {c.aberta && (
                        <span className="text-fg-muted-token">(sem limite)</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* O painel: resumo → abas → conteúdo com rolagem própria. */}
        <aside
          aria-label="Configuração de entrega"
          className="relative flex flex-col border-t border-border-token bg-surface-token lg:absolute lg:bottom-4 lg:left-4 lg:top-4 lg:w-[460px] lg:rounded-2xl lg:border lg:shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b border-border-token px-5 py-4">
            <MapPinIcon className="h-5 w-5 shrink-0 text-brand-ink" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-fg-token">{storeLocation?.name || 'Loja'}</p>
              <p className="truncate text-xs text-fg-muted-token">{storeLocation?.address || 'Endereço não cadastrado'}</p>
            </div>
            <Link
              to={settingsPath}
              aria-label="Editar localização"
              title="Editar localização"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted-token hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </Link>
          </header>

          {storeMetadata && (
            <dl className="mx-5 mt-4 grid grid-cols-3 divide-x divide-border-token rounded-xl bg-surface-2 py-2.5 text-center" aria-label="Resumo da entrega">
              {resumo.map((item) => (
                <div key={item.rotulo} className="px-2">
                  <dt className="text-xs font-medium text-fg-muted-token">{item.rotulo}</dt>
                  <dd className="mt-0.5 text-sm font-bold tabular-nums text-fg-token">{item.valor}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex min-h-0 flex-1 flex-col px-5 pt-3">
            <PageTabs abas={abas} ariaLabel="Seções da entrega" className="flex min-h-0 flex-1 flex-col gap-0 [&_[role=tab]]:px-2.5 [&_[role=tab]]:text-sm [&>[role=tabpanel]]:min-h-0 [&>[role=tabpanel]]:flex-1 [&>[role=tabpanel]]:overflow-y-auto [&>[role=tabpanel]]:pb-5 [&>[role=tabpanel]]:pt-4">
              {(aba) => (
                <>
                  {aba === 'faixas' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <SearchInput
                            placeholder="Buscar por nome…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                        <Button size="sm" onClick={() => handleOpenModal()} leftIcon={<PlusIcon className="h-4 w-4" />}>
                          Faixa
                        </Button>
                      </div>
              <Tabela<DeliveryZone>
                itens={zones}
                chave={(z) => String(z.id)}
                rotuloDaLinha={(z) => `Editar faixa ${z.name}`}
                onAbrir={(z) => handleOpenModal(z)}
                carregando={loading}
                falhou={erroAoCarregar}
                falha={{
                  titulo: 'Não foi possível carregar as faixas de entrega',
                  descricao: 'As faixas calculam o frete sozinho — elas podem continuar lá. Tente de novo.',
                }}
                onTentarDeNovo={loadData}
                vazio={{
                  titulo: 'Nenhuma faixa cadastrada',
                  descricao: 'Cadastre faixas de quilometragem para o frete ser calculado sozinho.',
                  icone: <MapPinIcon className="h-12 w-12" />,
                  acao: (
                    <Button onClick={() => handleOpenModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
                      Nova faixa
                    </Button>
                  ),
                }}
                colunas={[
                  {
                    chave: 'nome',
                    cabecalho: 'Faixa',
                    render: (z) => (
                      <div className="flex items-center gap-2">
                        {/* A bolinha usa a MESMA cor do anel no mapa. Sem isso o
                            desenho e a lista são dois objetos soltos: você vê seis
                            anéis em cima e seis linhas embaixo, e precisa contar de
                            fora para dentro para casar os dois. */}
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                          style={corDaFaixa(z.id)}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-fg-token">{z.name}</span>
                          <span className="block font-mono text-xs text-fg-muted-token">
                            {z.distance_label
                              ? z.distance_label
                              : z.min_km !== null && z.min_km !== undefined
                                ? `${formatKm(z.min_km)} a ${z.max_km !== null && z.max_km !== undefined ? formatKm(z.max_km) : '?'} km`
                                : '—'}
                          </span>
                        </span>
                      </div>
                    ),
                  },
                  {
                    chave: 'frete',
                    cabecalho: 'Frete',
                    render: (z) => (
                      <span className="text-base font-semibold text-brand-ink">
                        {formatCurrency(z.delivery_fee)}
                      </span>
                    ),
                  },
                  {
                    chave: 'status',
                    cabecalho: 'Status',
                    render: (z) => (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(z);
                        }}
                        aria-label={`${z.is_active ? 'Desativar' : 'Ativar'} faixa ${z.name}`}
                        className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {/* 'Inativa' era vermelho, a mesma cor de "excluir" e de erro.
                            Faixa desligada não é falha — é escolha sua. Vermelho ali
                            gasta o sinal que deveria alarmar. */}
                        <Badge tone={z.is_active ? 'success' : 'neutral'}>
                          {z.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </button>
                    ),
                  },
                  {
                    chave: 'acoes',
                    cabecalho: '',
                    alinhamento: 'direita',
                    render: (z) => (
                      <RowActions
                        rotulo={`Ações da faixa ${z.name}`}
                        acoes={[
                          {
                            rotulo: 'Editar',
                            icone: <PencilIcon className="h-4 w-4" />,
                            onClick: () => handleOpenModal(z),
                          },
                          { rotulo: z.is_active ? 'Desativar' : 'Ativar', onClick: () => handleToggleActive(z) },
                          {
                            rotulo: 'Excluir',
                            icone: <TrashIcon className="h-4 w-4" />,
                            destrutiva: true,
                            onClick: () => {
                              setDeletingZone(z);
                              setIsDeleteModalOpen(true);
                            },
                          },
                        ]}
                      />
                    ),
                  },
                ]}
              />
                    </div>
                  )}
                  {aba === 'preco' && storeId && (
                    <AoSair onSair={() => setRascunhoFormula(null)}>
                      <FormulaDeEntregaCard
                        key={storeId}
                        metadataAtual={storeMetadata ?? {}}
                        faixasAtivas={zones.filter((z) => z.is_active).length}
                        onSalvar={salvarMetadata}
                        onRascunho={setRascunhoFormula}
                      />
                    </AoSair>
                  )}
                  {aba === 'gratis' && storeId && (
                    <AoSair onSair={() => setRascunhoPromo(null)}>
                      <FreteGratisCard key={storeId} metadataAtual={storeMetadata ?? {}} onSalvar={salvarMetadata} onRascunho={setRascunhoPromo} />
                    </AoSair>
                  )}
                  {aba === 'excecoes' && storeId && (
                    <ZonasDePrecoFixoCard
                      key={storeId}
                      metadataAtual={storeMetadata}
                      categorias={categoriasDaLoja}
                      onSalvar={async (fixedPriceZones) => {
                        await salvarMetadata({ ...(storeMetadata ?? {}), fixed_price_zones: fixedPriceZones });
                      }}
                    />
                  )}
                  {aba === 'prazo' && (storeSlug || storeId) && <ComoOClienteRecebe loja={(storeSlug || storeId)!} />}
                  {aba === 'simular' && storeSlug && (
                    <SimuladorDeFreteCard key={storeSlug} storeSlug={storeSlug} metadataAtual={storeMetadata ?? {}} />
                  )}
                </>
              )}
            </PageTabs>
          </div>
        </aside>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingZone ? 'Editar Faixa de Entrega' : 'Nova Faixa de Entrega'}
      >
        <div className="space-y-5">
          {/* ORDEM: distância PRIMEIRO, nome depois.
              O formulário pedia o nome antes da faixa, mas o nome é derivado
              dela ("3 - 5 km"). Você era obrigado a inventar um rótulo para um
              intervalo que ainda não tinha escolhido — e o campo já sabia
              preencher sozinho, só que tarde demais para ajudar. */}
          <div>
            <label
              htmlFor="zona-distancia"
              className="mb-1 block text-body font-medium text-fg-token"
            >
              Faixa de distância <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              id="zona-distancia"
              value={formData.distance_band}
              onChange={(e) => {
                const nextBand = e.target.value;
                const matched = DISTANCE_BANDS.find((band) => band.value === nextBand);
                setFormData((prev) => ({
                  ...prev,
                  distance_band: nextBand,
                  name: prev.name || matched?.label || prev.name,
                }));
              }}
              className="w-full rounded border border-border-input bg-surface px-3 py-2 text-body text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Selecione uma faixa</option>
              {DISTANCE_BANDS.map((band) => (
                <option key={band.value} value={band.value}>{band.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Nome da faixa *"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Até 5km, Zona Metropolitana"
            />
            <p className="mt-1 text-caption text-fg-muted-token">
              Só você vê este nome — o cliente vê a taxa.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div>
              <Input
                label="Valor da entrega (R$) *"
                type="number"
                value={formData.delivery_fee}
                onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                placeholder="0,00"
              />
              <p className="mt-1 text-caption text-fg-muted-token">
                Cobrado do cliente no checkout.
              </p>
            </div>
            {/* "Prazo em dias úteis" saiu (26/10): delivery de comida promete
                minutos, e o prazo da loja mora em "Como o cliente recebe". */}
          </div>

          {/* Era um checkbox de 16px espremido ao lado de um campo numérico,
              alinhado com `mt-7` chutado. Ligar ou desligar uma faixa muda o
              que o cliente paga — merece a própria linha e a consequência
              escrita. */}
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded border border-border-token bg-surface-2 p-3">
            <span className="min-w-0">
              <span className="block text-body font-semibold text-fg-token">Faixa ativa</span>
              <span className="mt-0.5 block text-caption text-fg-muted-token">
                Desligada, o cliente desta distância não consegue fechar pedido
                por entrega — a menos que outra faixa o cubra.
              </span>
            </span>
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]"
            />
          </label>

          <div className="flex flex-row max-sm:flex-col-reverse justify-end gap-3 pt-4 border-t border-border-token">
            <Button variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto justify-center">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.distance_band}
              className="w-full sm:w-auto justify-center"
            >
              {saving ? 'Salvando...' : editingZone ? 'Salvar Alterações' : 'Criar Faixa'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingZone(null);
        }}
        title="Excluir Faixa de Entrega"
      >
        <div className="space-y-4">
          <p className="text-fg-muted-token">
            Tem certeza que deseja excluir a faixa <strong className="text-fg-token">{deletingZone?.name}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex flex-row max-sm:flex-col-reverse justify-end gap-3 pt-4 border-t border-border-token">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingZone(null);
              }}
              className="w-full sm:w-auto justify-center"
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving} className="w-full sm:w-auto justify-center">
              {saving ? 'Excluindo...' : 'Excluir Faixa'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
};

export default DeliveryZonesPage;
