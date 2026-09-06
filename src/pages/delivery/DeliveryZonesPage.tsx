import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Card, Button, Badge, StatCard, PageShell, RowActions, Tabela, SearchInput, Select } from '../../components/ui';
import DeliveryZonesMap, { COR_DA_PROMO, corDoAnel } from '../../components/maps/DeliveryZonesMap';
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
import { ZonasDePrecoFixoCard } from './ZonasDePrecoFixoCard';
import { FormulaDeEntregaCard } from './FormulaDeEntregaCard';
import { FreteGratisCard } from './FreteGratisCard';
import { anelDaPromo, lerPromo } from './freteGratis';
import { getStore, updateStore } from '../../services/storesApi';
import { formatCurrency } from '../../utils/formatters';

const formatKm = (value?: number | string | null) => {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  if (!Number.isFinite(numeric)) return '0.00';
  return numeric.toFixed(2);
};

const formatDays = (value?: number | string | null) => {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  if (Number.isNaN(numeric)) return '0';
  return String(Math.round(numeric));
};

const DISTANCE_BANDS = [
  { value: '0_2', label: '0 - 2 km' },
  { value: '2_5', label: '2 - 5 km' },
  { value: '5_8', label: '5 - 8 km' },
  { value: '8_12', label: '8 - 12 km' },
  { value: '12_15', label: '12 - 15 km' },
  { value: '15_20', label: '15 - 20 km' },
];

export const DeliveryZonesPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();

  const storeId = useMemo(() => {
    if (!routeStoreId) return contextStoreId || null;
    const match = stores.find(s => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || contextStoreId || null;
  }, [routeStoreId, contextStoreId, stores]);
  const settingsPath = storeId ? `/stores/${storeId}/settings` : '/settings';
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [stats, setStats] = useState<DeliveryZoneStats | null>(null);
  const [storeLocation, setStoreLocation] = useState<StoreLocation | null>(null);
  // Metadata completo da loja: as zonas de preço fixo moram nele, e a tela
  // precisa reenviar o resto intacto ao salvar — um PATCH com metadata parcial
  // apagaria coordenadas, fidelidade e configuração de entrega.
  const [storeMetadata, setStoreMetadata] = useState<Record<string, unknown> | undefined>();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [_error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

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
  const anelPromo = useMemo(
    () => anelDaPromo(lerPromo(storeMetadata ?? {})),
    [storeMetadata],
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

    try {
      setLoading(true);
      setError(null);
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
      logger.error('Error loading delivery zones:', err);
      setError('Erro ao carregar zonas de entrega');
    } finally {
      setLoading(false);
    }
  }, [search, filterActive, storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      setError('Selecione uma loja antes de criar uma zona de entrega');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
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
      setError('Erro ao salvar zona de entrega');
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

  return (
    <PageShell
      trilha={[{ rotulo: 'Configurações' }, { rotulo: 'Zonas de Entrega' }]}
      titulo="Zonas de Entrega"
      acoes={
        <Button onClick={() => handleOpenModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Nova Faixa
        </Button>
      }
    >

      {/* Store Location Card - Read Only */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-fg-token">Localização da Loja</h2>
            <p className="text-sm text-fg-muted-token mt-1">
              A localização é usada para calcular a distância de entrega.
            </p>
          </div>
          <Link
            to={settingsPath}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-ink bg-brand-soft rounded hover:bg-brand-soft/80 transition-colors"
          >
            <Cog6ToothIcon className="w-4 h-4" />
            Editar Localização
          </Link>
        </div>

        {storeLocation ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-fg-muted-token">Nome da Loja</p>
                <p className="text-base text-fg-token">{storeLocation.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-fg-muted-token">CEP</p>
                <p className="text-base text-fg-token">{storeLocation.zip_code || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-fg-muted-token">Cidade/Estado</p>
                <p className="text-base text-fg-token">
                  {storeLocation.city && storeLocation.state 
                    ? `${storeLocation.city}/${storeLocation.state}` 
                    : '-'}
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-fg-muted-token">Endereço</p>
              <p className="text-base text-fg-token">{storeLocation.address || '-'}</p>
            </div>

            {temCoordenadas ? (
              <div className="mt-4 space-y-2">
                {/* Mapa de verdade: pin na loja + um círculo por faixa.
                    Configurar frete é abstrato — você digita "12 km, R$ 20" sem
                    ver o que está vendendo. O desenho responde a pergunta que o
                    formulário não responde: até onde eu entrego? */}
                <DeliveryZonesMap storeLocation={storeLocation} zones={zones} promo={anelPromo} />

                {/* Legenda ligando COR → faixa → taxa.
                    Sem ela o mapa é bonito e mudo: você vê seis anéis
                    coloridos e não sabe qual cobra quanto, então volta para a
                    tabela e o desenho não serviu para nada. */}
                {(circulosDoMapa.length > 0 || anelPromo) && (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
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

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-caption text-fg-muted-token">
                    Ctrl + roda do mouse dá zoom. O botão de tela cheia abre o mapa inteiro.
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${storeLocation?.latitude},${storeLocation?.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-caption font-semibold text-brand-ink hover:underline"
                  >
                    Abrir no Google Maps →
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded border border-dashed border-border-token bg-surface-2 p-4">
                <p className="text-body text-fg-muted-token">
                  Sem latitude e longitude não dá para desenhar o mapa nem calcular
                  distância — o frete cai na faixa padrão.{' '}
                  <Link to={settingsPath} className="font-semibold text-brand-ink hover:underline">
                    Definir a localização
                  </Link>
                </p>
              </div>
            )}
          </div>
        ) : locationError ? (
          <div className="py-8 text-center">
            <ExclamationTriangleIcon className="mx-auto mb-3 h-10 w-10 text-[var(--warning)]" />
            <p className="mb-1 text-body font-semibold text-fg-token">{locationError}</p>
            <p className="mb-4 text-caption text-fg-muted-token">
              O endereço pode estar cadastrado — foi a leitura que falhou. As faixas
              abaixo continuam valendo.
            </p>
            <Button variant="outline" onClick={loadData}>Tentar novamente</Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <MapPinIcon className="w-12 h-12 text-fg-muted-token mx-auto mb-3" />
            <p className="text-fg-muted-token mb-4">Localização não configurada</p>
            <Link
              to={settingsPath}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-brand bg-brand rounded hover:bg-brand-hover transition-colors"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Configurar Localização
            </Link>
          </div>
        )}
      </Card>

      {/* O PREÇO mora aqui, não nas 16 faixas. Cada loja tinha uma faixa por
          quilômetro — três números digitados dezesseis vezes, com uma
          irregularidade escondida (a faixa 3-5km cobria 2 km). E a fórmula que
          o dono editava em Configurações não valia nada, porque as faixas têm
          precedência: duas telas discordando sobre o mesmo número. */}
      {storeId && (
        <FormulaDeEntregaCard
          key={storeId}
          metadataAtual={storeMetadata ?? {}}
          faixasAtivas={zones.filter((z) => z.is_active).length}
          onSalvar={async (novoMetadata) => {
            await updateStore(storeId, { metadata: novoMetadata });
            setStoreMetadata(novoMetadata);
          }}
        />
      )}

      {/* A promoção vem logo abaixo do preço porque ela SOBRESCREVE o preço:
          quem lê a fórmula precisa ver, na mesma rolagem, que existe um raio
          onde ela não vale. */}
      {storeId && (
        <FreteGratisCard
          key={storeId}
          metadataAtual={storeMetadata ?? {}}
          onSalvar={async (novoMetadata) => {
            await updateStore(storeId, { metadata: novoMetadata });
            setStoreMetadata(novoMetadata);
          }}
        />
      )}

      {/* As faixas por km resolvem a cidade; as zonas abaixo resolvem as
          exceções (condomínio longe, prédio com portaria demorada). O recurso
          já existia no backend e ninguém conseguia ligar sem editar JSON no
          banco — por isso nenhuma loja tinha uma zona sequer. */}
      {storeId && (
        <ZonasDePrecoFixoCard
          key={storeId}
          metadataAtual={storeMetadata}
          onSalvar={async (fixedPriceZones) => {
            const atual = storeMetadata ?? {};
            const novo = { ...atual, fixed_price_zones: fixedPriceZones };
            await updateStore(storeId, { metadata: novo });
            setStoreMetadata(novo);
          }}
        />
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-3 md:gap-4">
          <StatCard label="Total de Faixas" value={stats.total} />
          <StatCard label="Ativas" value={stats.active} tone="brand" />
          <StatCard label="Valor Médio" value={formatCurrency(stats.avg_fee)} />
          <StatCard label="Prazo Médio" value={`${formatDays(stats.avg_days)} dias`} />
        </div>
      )}

      {/* Filters */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-row max-sm:flex-col gap-3 md:gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="w-full sm:w-auto"
            rotuloOculto="Filtrar por status"
            vazio="Todos os status"
            valor={filterActive === undefined ? '' : String(filterActive)}
            onMudar={(v) => setFilterActive(v === '' ? undefined : v === 'true')}
            opcoes={[
              { valor: 'true', rotulo: 'Ativas' },
              { valor: 'false', rotulo: 'Inativas' },
            ]}
          />
        </div>
      </Card>

      {/* Zones Table */}
      <Tabela<DeliveryZone>
        itens={zones}
        chave={(z) => String(z.id)}
        rotuloDaLinha={(z) => `Editar faixa ${z.name}`}
        onAbrir={(z) => handleOpenModal(z)}
        carregando={loading}
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
                <span className="font-medium text-fg-token">{z.name}</span>
              </div>
            ),
          },
          {
            chave: 'distancia',
            cabecalho: 'Distância',
            render: (z) => (
              <span className="font-mono text-sm">
                {z.distance_label
                  ? z.distance_label
                  : z.min_km !== null && z.min_km !== undefined
                    ? `${formatKm(z.min_km)} - ${
                        z.max_km !== null && z.max_km !== undefined ? formatKm(z.max_km) : '?'
                      } km`
                    : '—'}
              </span>
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
            chave: 'prazo',
            cabecalho: 'Prazo',
            render: (z) =>
              `${z.estimated_days} ${z.estimated_days === 1 ? 'dia útil' : 'dias úteis'}`,
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
            cabecalho: 'Ações',
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
            <p className="mt-1 text-caption text-fg-muted-token">
              Distância em linha reta entre a loja e o endereço do cliente.
            </p>
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
            <div>
              <Input
                label="Prazo de entrega (dias) *"
                type="number"
                value={formData.estimated_days}
                onChange={(e) => setFormData({ ...formData, estimated_days: parseInt(e.target.value) || 1 })}
                min="1"
              />
              <p className="mt-1 text-caption text-fg-muted-token">
                Aparece como previsão no pedido.
              </p>
            </div>
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
