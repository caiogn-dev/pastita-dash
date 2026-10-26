import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  BuildingStorefrontIcon,
  BanknotesIcon,
  DocumentTextIcon,
  MapPinIcon,
  TruckIcon,
  ClockIcon,
  PauseCircleIcon,
  ChartBarIcon,
  StarIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import {
  getStore,
  updateStore,
  getStoreMetaTracking,
  updateStoreMetaTracking,
  type Store,
  type StoreMetaTracking,
} from '../../services/storesApi';
import { useStore } from '../../hooks';
import logger from '../../services/logger';
import {
  Card,
  StatCard,
  PageShell,
  PageTabs,
  BarraDeAlteracoes,
  Campo,
  CampoDeTelefone,
  Input,
} from '../../components/ui';
import { Switch } from '../../components/common';
import { cn } from '../../utils/cn';
import { aoAlternarModo, resumoDosModos, type ModosDeRecebimento, type Modo } from './modosDeRecebimento';
import RecebimentoSection from './RecebimentoSection';
import VoucherSection from './VoucherSection';
import ValePorLinkSection from './ValePorLinkSection';
import AcrescimoDoValeSection from './AcrescimoDoValeSection';
import NotaFiscalSection from './NotaFiscalSection';
import { SalvarJunto, useSalvarJunto } from './salvarJunto';
import CaixaDinheiroSection from './CaixaDinheiroSection';
import AvisoFilaHumanaSection from './AvisoFilaHumanaSection';
import { LocalizacaoNoGoogle } from './LocalizacaoNoGoogle';
import AgendamentoCampos from './AgendamentoCampos';

const DAYS = [
  { key: 'monday',    label: 'Segunda' },
  { key: 'tuesday',   label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday',  label: 'Quinta' },
  { key: 'friday',    label: 'Sexta' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
];

import {
  AGENDAMENTO_PADRAO, lerAgendamento, type Agendamento,
  lerPausas, pausaParaGravar, pausasQueValem, problemaDaPausa, problemaDosTurnos, turnosDoDia,
  type DayHours, type OperatingHours, type Pausa,
} from './horarios';
import { HorariosDaSemana } from './HorariosDaSemana';
import { PausasProgramadas } from './PausasProgramadas';

const DEFAULT_HOURS: DayHours = { is_open: true, open: '08:00', close: '22:00' };

const defaultMetaTracking: StoreMetaTracking = {
  meta_pixel_id: '',
  meta_pixel_enabled: false,
  meta_capi_enabled: false,
  meta_capi_access_token: '',
  meta_capi_token_configured: false,
  meta_capi_test_event_code: '',
  clarity_id: '',
  clarity_enabled: false,
};

const FORM_VAZIO = {
  name: '',
  email: '',
  phone: '',
  whatsapp_number: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  latitude: '',
  longitude: '',
  prazo_entrega_min: '',
  prazo_entrega_max: '',
  tempo_preparo: '',
};
type FormDaLoja = typeof FORM_VAZIO;

const CAMPOS_DA_LOJA: (keyof FormDaLoja)[] = ['name', 'email', 'phone', 'whatsapp_number'];
const CAMPOS_DO_LOCAL: (keyof FormDaLoja)[] = ['address', 'city', 'state', 'zip_code', 'latitude', 'longitude'];
const CAMPOS_DO_PRAZO: (keyof FormDaLoja)[] = ['prazo_entrega_min', 'prazo_entrega_max'];

/** Tempo de preparo vazio = 0 = sem previsão "pronto às" no quadro de pedidos. */
const erroDoPreparo = (texto: string) => {
  const limpo = texto.trim();
  const n = limpo === '' ? 0 : Number(limpo);
  return Number.isInteger(n) && n >= 0 && n <= 600 ? null : 'Use um número inteiro de 0 a 600 minutos.';
};

const minutosOuZero = (texto: string) => {
  const n = parseInt(texto, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const CAMPOS_DO_RASTREIO: (keyof StoreMetaTracking)[] = [
  'meta_pixel_id', 'meta_pixel_enabled', 'meta_capi_enabled', 'meta_capi_test_event_code', 'clarity_id', 'clarity_enabled',
];

/** O que está gravado no servidor — é contra isto que se conta "o que mudou". */
interface Salvo {
  form: FormDaLoja;
  horas: OperatingHours;
  pausas: Pausa[];
  avaliacao: string;
  rastreio: StoreMetaTracking;
  agendamento: Agendamento;
}

const SALVO_VAZIO: Salvo = {
  form: FORM_VAZIO, horas: {}, pausas: [], avaliacao: '', rastreio: defaultMetaTracking, agendamento: AGENDAMENTO_PADRAO,
};

const iguais = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Erro de coordenada em texto, ou null. Vale só ao salvar, não a cada tecla. */
function erroDaCoordenada(valor: string, limite: 90 | 180): string | null {
  if (!valor.trim()) return null;
  const n = parseFloat(valor);
  if (Number.isNaN(n)) return 'Use um número, como -10.18';
  if (n < -limite || n > limite) return `Precisa estar entre -${limite} e ${limite}`;
  return null;
}

export const StoreSettingsPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();

  const effectiveStoreId = useMemo(() => {
    if (!routeStoreId) return contextStoreId || null;
    const match = stores.find((store) => store.id === routeStoreId || store.slug === routeStoreId);
    return match?.slug || routeStoreId;
  }, [routeStoreId, contextStoreId, stores]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [salvo, setSalvo] = useState<Salvo>(SALVO_VAZIO);
  const [storeForm, setStoreForm] = useState<FormDaLoja>(FORM_VAZIO);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({});
  const [pausas, setPausas] = useState<Pausa[]>([]);
  const [agendamento, setAgendamento] = useState<Agendamento>(AGENDAMENTO_PADRAO);
  const [metaTracking, setMetaTracking] = useState<StoreMetaTracking>(defaultMetaTracking);
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [erros, setErros] = useState<{ latitude?: string | null; longitude?: string | null; prazo?: string | null; preparo?: string | null }>({});
  /** Entrega/retirada: os campos existem no banco e o cardápio já os respeita
   *  — faltava o dono poder mudar depois do onboarding. */
  const [modos, setModos] = useState<ModosDeRecebimento>({ delivery: true, pickup: true });
  const [salvandoModos, setSalvandoModos] = useState<Modo | null>(null);

  /**
   * Liga/desliga entrega ou retirada.
   *
   * Salva no ato (fora da barra de alterações): é um interruptor de duas
   * posições e o efeito é imediato no cardápio. Em caso de erro, volta ao
   * estado anterior — deixar o botão ligado sem ter salvo é pior que não mexer.
   */
  const alternarRecebimento = useCallback(async (modo: Modo, ligado: boolean) => {
    const anterior = modos;
    const novo = aoAlternarModo(anterior, modo, ligado);
    if (!novo) {
      toast.error('A loja precisa de pelo menos uma forma de receber: entrega ou retirada.');
      return;
    }
    if (!effectiveStoreId) return;
    setModos(novo);
    setSalvandoModos(modo);
    try {
      await updateStore(effectiveStoreId, {
        delivery_enabled: novo.delivery,
        pickup_enabled: novo.pickup,
      });
      toast.success(resumoDosModos(novo));
    } catch (error) {
      setModos(anterior);
      logger.error('Erro ao salvar formas de recebimento:', error);
      toast.error('Não foi possível salvar. Nada mudou no cardápio.');
    } finally {
      setSalvandoModos(null);
    }
  }, [modos, effectiveStoreId]);

  /** `silencioso`: depois de salvar, recarrega sem trocar a tela pelo "Carregando". */
  const loadStore = useCallback(async (silencioso = false) => {
    if (!effectiveStoreId) {
      setLoading(false);
      return;
    }

    if (!silencioso) setLoading(true);
    try {
      const [data, tracking] = await Promise.all([
        getStore(effectiveStoreId),
        getStoreMetaTracking(effectiveStoreId),
      ]);
      setStore(data);

      const form: FormDaLoja = {
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        whatsapp_number: data.whatsapp_number || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        latitude: data.latitude?.toString() || '',
        longitude: data.longitude?.toString() || '',
        prazo_entrega_min: data.prazo_entrega_min ? String(data.prazo_entrega_min) : '',
        prazo_entrega_max: data.prazo_entrega_max ? String(data.prazo_entrega_max) : '',
        tempo_preparo: data.default_prep_minutes ? String(data.default_prep_minutes) : '',
      };
      const stored = (data.operating_hours as OperatingHours) || {};
      const horas: OperatingHours = {};
      DAYS.forEach(d => {
        horas[d.key] = stored[d.key] || { ...DEFAULT_HOURS, is_open: d.key !== 'sunday' };
      });
      const avaliacao = String((data.metadata || {}).google_review_url || '');
      const rastreio = { ...tracking, meta_capi_access_token: '' };

      const pausasSalvas = lerPausas(data.metadata as Record<string, unknown>);
      const agendamentoSalvo = lerAgendamento(data.metadata as Record<string, unknown>);
      setSalvo({ form, horas, pausas: pausasSalvas, avaliacao, rastreio, agendamento: agendamentoSalvo });
      setAgendamento(agendamentoSalvo);
      setStoreForm(form);
      setOperatingHours(horas);
      setPausas(pausasSalvas);
      setGoogleReviewUrl(avaliacao);
      setMetaTracking(rastreio);
      setErros({});
      setModos({
        delivery: data.delivery_enabled !== false,
        pickup: data.pickup_enabled !== false,
      });
    } catch (error) {
      logger.error('Error loading store:', error);
      toast.error('Erro ao carregar configurações da loja');
    } finally {
      setLoading(false);
    }
  }, [effectiveStoreId]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  // ── O que mudou, por seção ────────────────────────────────────────────
  const mudouNaLoja = CAMPOS_DA_LOJA.filter((k) => storeForm[k] !== salvo.form[k]);
  const mudouNoLocal = CAMPOS_DO_LOCAL.filter((k) => storeForm[k] !== salvo.form[k]);
  const mudouNoPrazo = CAMPOS_DO_PRAZO.filter((k) => storeForm[k] !== salvo.form[k]);
  const preparoMudou = storeForm.tempo_preparo !== salvo.form.tempo_preparo;
  const diasMudados = DAYS.filter((d) => !iguais(operatingHours[d.key], salvo.horas[d.key]));
  const pausasMudaram = !iguais(pausas, salvo.pausas);
  const agendamentoMudou = !iguais(agendamento, salvo.agendamento);
  const avaliacaoMudou = googleReviewUrl.trim() !== salvo.avaliacao.trim();
  const rastreioMudado = CAMPOS_DO_RASTREIO.filter((k) => metaTracking[k] !== salvo.rastreio[k]).length
    + (metaTracking.meta_capi_access_token?.trim() ? 1 : 0);

  // Vale, vale por QR Code, acréscimo e nota fiscal gravam fora da loja, cada
  // uma no seu endpoint — mas entram na mesma barra e no mesmo Salvar.
  const juntas = useSalvarJunto();

  const quantidade = juntas.mudancas + mudouNaLoja.length + mudouNoLocal.length + mudouNoPrazo.length + diasMudados.length
    + (preparoMudou ? 1 : 0) + (agendamentoMudou ? 1 : 0) + (avaliacaoMudou ? 1 : 0) + (pausasMudaram ? 1 : 0) + rastreioMudado;

  // Sair da página com alteração pendente perde o que foi digitado.
  useEffect(() => {
    if (quantidade === 0) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [quantidade]);

  const descartar = () => {
    setStoreForm(salvo.form);
    setOperatingHours(salvo.horas);
    setPausas(salvo.pausas);
    setAgendamento(salvo.agendamento);
    setGoogleReviewUrl(salvo.avaliacao);
    setMetaTracking(salvo.rastreio);
    setErros({});
    juntas.descartar();
  };

  /**
   * UM salvar para a página. Eram cinco ("Salvar Informações", "Salvar
   * Localização", "Salvar Horários", "Salvar Rastreamento", "Salvar Link de
   * Avaliação"): mexia-se no horário e no nome, salvava-se um, e o outro se
   * perdia ao trocar de aba. Tudo que é da loja vai numa gravação só — com o
   * metadata montado uma vez, para a avaliação e as coordenadas não se
   * sobrescreverem.
   */
  const salvar = async () => {
    if (!effectiveStoreId) return;

    const erroDasSecoes = juntas.validar();
    if (erroDasSecoes) {
      toast.error(erroDasSecoes);
      return;
    }

    if (mudouNoLocal.length) {
      const novosErros = {
        latitude: erroDaCoordenada(storeForm.latitude, 90),
        longitude: erroDaCoordenada(storeForm.longitude, 180),
      };
      setErros(novosErros);
      if (novosErros.latitude || novosErros.longitude) {
        toast.error('Confira a localização antes de salvar.');
        return;
      }
    }

    if (diasMudados.length) {
      const ruim = diasMudados.find((d) => operatingHours[d.key]?.is_open && problemaDosTurnos(turnosDoDia(operatingHours[d.key])));
      if (ruim) {
        toast.error(`${ruim.label}: ${problemaDosTurnos(turnosDoDia(operatingHours[ruim.key]))}`);
        return;
      }
    }
    if (pausasMudaram) {
      const erroDaPausa = pausas.map(problemaDaPausa).find(Boolean);
      if (erroDaPausa) {
        toast.error(erroDaPausa);
        return;
      }
    }

    if (mudouNoPrazo.length) {
      const minimo = minutosOuZero(storeForm.prazo_entrega_min);
      const maximo = minutosOuZero(storeForm.prazo_entrega_max);
      const erroDoPrazo = maximo && minimo > maximo ? 'O mínimo não pode passar do máximo.' : null;
      setErros((atual) => ({ ...atual, prazo: erroDoPrazo }));
      if (erroDoPrazo) {
        toast.error('Confira o prazo de entrega antes de salvar.');
        return;
      }
    }

    if (preparoMudou) {
      const erro = erroDoPreparo(storeForm.tempo_preparo);
      setErros((atual) => ({ ...atual, preparo: erro }));
      if (erro) {
        toast.error('Confira o tempo de preparo antes de salvar.');
        return;
      }
    }

    const payload: Record<string, unknown> = {};
    if (preparoMudou) payload.default_prep_minutes = Number(storeForm.tempo_preparo.trim() || 0);
    if (mudouNoPrazo.length) {
      payload.prazo_entrega_min = minutosOuZero(storeForm.prazo_entrega_min);
      payload.prazo_entrega_max = minutosOuZero(storeForm.prazo_entrega_max);
    }
    const metadata: Record<string, unknown> = { ...(store?.metadata || {}) };
    let mexeuNoMetadata = false;

    for (const k of mudouNaLoja) payload[k] = storeForm[k];
    if (mudouNoLocal.length) {
      for (const k of ['address', 'city', 'state', 'zip_code'] as const) payload[k] = storeForm[k];
      if (storeForm.latitude.trim() && storeForm.longitude.trim()) {
        const lat = parseFloat(storeForm.latitude);
        const lng = parseFloat(storeForm.longitude);
        // Campos do modelo (o form recarrega a partir destes) + metadata como
        // fallback legado lido por geo/service.py e maps_views.py.
        payload.latitude = lat;
        payload.longitude = lng;
        metadata.store_latitude = lat;
        metadata.store_longitude = lng;
        mexeuNoMetadata = true;
      }
    }
    if (diasMudados.length) payload.operating_hours = operatingHours;
    if (pausasMudaram) {
      // Vencidas saem: o dono não precisa faxinar o que já passou.
      metadata.pausas = pausasQueValem(pausas, new Date()).map(pausaParaGravar);
      mexeuNoMetadata = true;
    }
    if (agendamentoMudou) {
      metadata.agendamento = agendamento;
      mexeuNoMetadata = true;
    }
    if (avaliacaoMudou) {
      metadata.google_review_url = googleReviewUrl.trim();
      mexeuNoMetadata = true;
    }
    if (mexeuNoMetadata) payload.metadata = metadata;

    setSaving(true);
    try {
      if (Object.keys(payload).length) {
        await updateStore(effectiveStoreId, payload);
      }
      if (rastreioMudado) {
        const dados: Partial<StoreMetaTracking> = {
          meta_pixel_id: metaTracking.meta_pixel_id.trim(),
          meta_pixel_enabled: metaTracking.meta_pixel_enabled,
          meta_capi_enabled: metaTracking.meta_capi_enabled,
          meta_capi_test_event_code: metaTracking.meta_capi_test_event_code.trim(),
          clarity_id: metaTracking.clarity_id.trim(),
          clarity_enabled: metaTracking.clarity_enabled,
        };
        if (metaTracking.meta_capi_access_token?.trim()) {
          dados.meta_capi_access_token = metaTracking.meta_capi_access_token.trim();
        }
        await updateStoreMetaTracking(effectiveStoreId, dados);
      }
      await juntas.salvar();
      toast.success(quantidade === 1 ? 'Alteração salva' : `${quantidade} alterações salvas`);
      await loadStore(true);
    } catch (error) {
      logger.error('Error saving store settings:', error);
      toast.error('Não foi possível salvar. As alterações continuam aqui.');
    } finally {
      setSaving(false);
    }
  };

  const mudarForm = (campo: keyof FormDaLoja) => (valor: string) =>
    setStoreForm((atual) => ({ ...atual, [campo]: valor }));

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 text-fg-muted-token animate-spin mx-auto mb-3" />
          <p className="text-fg-muted-token">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!effectiveStoreId) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center max-w-md">
          <BuildingStorefrontIcon className="w-12 h-12 text-fg-muted-token mx-auto mb-3" />
          <p className="text-fg-muted-token">Selecione uma loja para configurar.</p>
        </div>
      </div>
    );
  }

  return (
    // `min-h-screen` + `p-6` próprios criavam uma segunda casca dentro da
    // casca do app: a página tinha o próprio fundo e o próprio respiro, e
    // encostava diferente das outras. Quem espaça é o <main>.
    <PageShell
      titulo="Geral"
      className="mx-auto max-w-6xl"
    >

      {/* Os KPIs ficam FORA das seções: respondem "como esta loja está", e a
          resposta não muda conforme a seção aberta. */}
        <div className="grid grid-cols-3 max-md:grid-cols-1 gap-4">
          <StatCard
            label="Status"
            value={store?.status === 'active' ? 'Ativa' : 'Inativa'}
            tone={store?.status === 'active' ? 'brand' : 'default'}
          />
          <StatCard label="Pedidos" value={store?.orders_count ?? 0} />
          <StatCard label="Produtos" value={store?.products_count ?? 0} />
        </div>

      {/* Molde Configurações: seções à esquerda, conteúdo ao lado, um salvar.
          Sete abas numa linha já passavam da largura e escondiam as últimas. */}
      <SalvarJunto registro={juntas.registro}>
      <PageTabs
        lateral
        ariaLabel="Seções das configurações da loja"
        abas={[
          { id: 'loja', rotulo: 'Loja', icone: BuildingStorefrontIcon, mudou: mudouNaLoja.length + mudouNoLocal.length > 0 },
          { id: 'entrega', rotulo: 'Entrega e horários', icone: ClockIcon, mudou: diasMudados.length + mudouNoPrazo.length > 0 || preparoMudou || agendamentoMudou },
          { id: 'rastreamento', rotulo: 'Rastreamento', icone: ChartBarIcon, mudou: rastreioMudado > 0 },
          { id: 'avaliacoes', rotulo: 'Avaliações', icone: StarIcon, mudou: avaliacaoMudou },
          { id: 'recebimento', rotulo: 'Recebimento', icone: BanknotesIcon, mudou: juntas.mudouEm('vale-pagarme', 'vale-por-link', 'acrescimo-do-vale') },
          { id: 'fiscal', rotulo: 'Nota fiscal', icone: DocumentTextIcon, mudou: juntas.mudouEm('nota-fiscal') },
          { id: 'atendimento', rotulo: 'Atendimento', icone: ChatBubbleLeftRightIcon },
        ]}
      >
        {(aba) => (
          <div className="flex flex-col gap-6">
            {aba === 'loja' && (
              <>
                <Card className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-token">
                    <BuildingStorefrontIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
                    Informações da loja
                  </h2>
                  <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                    <Campo rotulo="Nome da loja" className="col-span-2 max-md:col-span-1">
                      <Input value={storeForm.name} onChange={(e) => mudarForm('name')(e.target.value)} />
                    </Campo>
                    <Campo rotulo="E-mail">
                      <Input type="email" value={storeForm.email} onChange={(e) => mudarForm('email')(e.target.value)} />
                    </Campo>
                    <CampoDeTelefone rotulo="Telefone" valor={storeForm.phone} onMudar={mudarForm('phone')} />
                    <CampoDeTelefone
                      rotulo="WhatsApp"
                      valor={storeForm.whatsapp_number}
                      onMudar={mudarForm('whatsapp_number')}
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-token">
                    <MapPinIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
                    Localização
                  </h2>
                  <div className="grid grid-cols-6 gap-4 max-md:grid-cols-2">
                    <Campo rotulo="Endereço" className="col-span-6 max-md:col-span-2">
                      <Input value={storeForm.address} onChange={(e) => mudarForm('address')(e.target.value)} />
                    </Campo>
                    <Campo rotulo="Cidade" className="col-span-3 max-md:col-span-2">
                      <Input value={storeForm.city} onChange={(e) => mudarForm('city')(e.target.value)} />
                    </Campo>
                    <Campo rotulo="Estado" className="col-span-1">
                      <Input
                        value={storeForm.state}
                        maxLength={2}
                        onChange={(e) => mudarForm('state')(e.target.value.toUpperCase())}
                      />
                    </Campo>
                    <Campo rotulo="CEP" className="col-span-2 max-md:col-span-1">
                      <Input
                        inputMode="numeric"
                        value={storeForm.zip_code}
                        onChange={(e) => mudarForm('zip_code')(e.target.value)}
                      />
                    </Campo>
                  </div>

                  <div className="mt-5 flex flex-col gap-4 border-t border-border-token pt-5">
                    {effectiveStoreId && (
                      <LocalizacaoNoGoogle
                        storeSlug={effectiveStoreId}
                        onEscolher={({ lat, lng, endereco }) => setStoreForm((atual) => ({
                          ...atual,
                          latitude: String(lat),
                          longitude: String(lng),
                          address: atual.address || endereco || '',
                        }))}
                      />
                    )}
                    <div className="grid grid-cols-2 items-start gap-4">
                      <Campo rotulo="Latitude" erro={erros.latitude}>
                        <Input
                          inputMode="decimal"
                          className="tabular-nums"
                          value={storeForm.latitude}
                          onChange={(e) => mudarForm('latitude')(e.target.value)}
                        />
                      </Campo>
                      <Campo rotulo="Longitude" erro={erros.longitude}>
                        <Input
                          inputMode="decimal"
                          className="tabular-nums"
                          value={storeForm.longitude}
                          onChange={(e) => mudarForm('longitude')(e.target.value)}
                        />
                      </Campo>
                    </div>
                    {storeForm.latitude && storeForm.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${storeForm.latitude},${storeForm.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 self-start text-sm font-semibold text-brand-ink hover:underline"
                      >
                        <MapPinIcon className="h-4 w-4" aria-hidden /> Ver no mapa
                      </a>
                    )}
                  </div>
                </Card>
              </>
            )}

            {aba === 'entrega' && (
              <>
        {/* COMO O CLIENTE RECEBE — antes do preço, porque decide se o preço
            sequer existe. Salva no ato (ver alternarRecebimento). */}
        <Card className="p-6">
          <div className="mb-1 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-fg-muted-token" />
            <h2 className="text-lg font-semibold text-fg-token">Como o cliente recebe</h2>
          </div>
          <p className="text-sm text-fg-muted-token">{resumoDosModos(modos)}</p>

          <ul className="mt-4 divide-y divide-border-token">
            {([
              { modo: 'delivery' as Modo, titulo: 'Entrega', Icone: TruckIcon },
              { modo: 'pickup' as Modo, titulo: 'Retirada no balcão', Icone: BuildingStorefrontIcon },
            ]).map(({ modo, titulo, Icone }) => {
              const ligado = modos[modo];
              return (
                <li key={modo} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      ligado
                        ? 'border-brand/40 bg-brand-soft text-brand-ink'
                        : 'border-border-token bg-surface-2 text-fg-muted-token'
                    }`}
                  >
                    <Icone className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg-token">{titulo}</p>
                  </div>
                  <Switch
                    checked={ligado}
                    disabled={salvandoModos !== null}
                    onChange={(marcado) => alternarRecebimento(modo, marcado)}
                    ariaLabel={titulo}
                  />
                </li>
              );
            })}
          </ul>

          {/* O PREÇO da entrega mora em Zonas de Entrega, não aqui: esta aba
              já teve uma terceira cópia da matemática do frete. */}
          <Link
            to={effectiveStoreId ? `/stores/${effectiveStoreId}/delivery` : '/stores'}
            className="mt-4 inline-flex items-center gap-2 rounded bg-brand-soft px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-soft/80"
          >
            <TruckIcon className="w-4 h-4" />
            Abrir preço da entrega
          </Link>
        </Card>

        {/* A promessa que o cliente vê no cardápio, no checkout e no WhatsApp
            ("chega entre 13:14 e 13:29"). Atraso é o que passa do máximo. */}
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-token">
            <TruckIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
            Prazo de entrega
          </h2>
          <div className="grid max-w-md grid-cols-2 items-start gap-4">
            <Campo rotulo="Prazo mínimo" erro={erros.prazo}>
              <Input
                type="number" inputMode="numeric" min={0} max={600}
                rightAddon="min" className="tabular-nums" placeholder="30"
                value={storeForm.prazo_entrega_min}
                onChange={(e) => mudarForm('prazo_entrega_min')(e.target.value)}
              />
            </Campo>
            <Campo rotulo="Prazo máximo">
              <Input
                type="number" inputMode="numeric" min={0} max={600}
                rightAddon="min" className="tabular-nums" placeholder="45"
                value={storeForm.prazo_entrega_max}
                onChange={(e) => mudarForm('prazo_entrega_max')(e.target.value)}
              />
            </Campo>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-token">
            <ClockIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
            Horários de funcionamento
          </h2>
          <HorariosDaSemana dias={DAYS} horas={operatingHours} padrao={DEFAULT_HOURS} onChange={setOperatingHours} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-token">
            <PauseCircleIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
            Pausas programadas
          </h2>
          <PausasProgramadas pausas={pausas} onChange={setPausas} />
        </Card>
        {/* Copiado para o pedido quando entra em preparo: vira o "pronto às"
            do quadro, que marca ATRASADO quando passa. 0 desliga. */}
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-token">
            <ClockIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
            Tempo de preparo
          </h2>
          <div className="max-w-[12rem]">
            <Campo rotulo="Tempo padrão" erro={erros.preparo}>
              <Input
                type="number" inputMode="numeric" min={0} max={600}
                rightAddon="min" className="tabular-nums" placeholder="20"
                value={storeForm.tempo_preparo}
                onChange={(e) => mudarForm('tempo_preparo')(e.target.value)}
              />
            </Campo>
          </div>
        </Card>
        <AgendamentoCampos valor={agendamento} onChange={setAgendamento} horas={operatingHours} />
              </>
            )}

            {aba === 'rastreamento' && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-token">
                  <ChartBarIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
                  Anúncios no Facebook e Instagram
                </h2>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4 max-md:grid-cols-1">
                  <Campo rotulo="Número do Pixel">
                    <Input
                      inputMode="numeric"
                      placeholder="Ex.: 123456789012345"
                      value={metaTracking.meta_pixel_id}
                      onChange={e => setMetaTracking(prev => ({
                        ...prev,
                        meta_pixel_id: e.target.value.replace(/\D/g, ''),
                      }))}
                    />
                  </Campo>
                  <Campo
                    rotulo="Chave de conversões"
                    extra={metaTracking.meta_capi_token_configured ? 'configurado' : undefined}
                  >
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder={metaTracking.meta_capi_token_configured ? 'Vazio mantém o atual' : 'Copie do Gerenciador de Eventos'}
                      value={metaTracking.meta_capi_access_token || ''}
                      onChange={e => setMetaTracking(prev => ({ ...prev, meta_capi_access_token: e.target.value }))}
                    />
                  </Campo>
                  <LinhaComChave
                    rotulo="Medir visitas do cardápio"
                    ligado={metaTracking.meta_pixel_enabled}
                    onMudar={(v) => setMetaTracking(prev => ({ ...prev, meta_pixel_enabled: v }))}
                  />
                  <LinhaComChave
                    rotulo="Avisar o Facebook de cada venda"
                    ligado={metaTracking.meta_capi_enabled}
                    onMudar={(v) => setMetaTracking(prev => ({ ...prev, meta_capi_enabled: v }))}
                  />
                </div>

                <h2 className="mb-4 mt-6 flex items-center gap-2 border-t border-border-token pt-5 text-lg font-semibold text-fg-token">
                  <ChartBarIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
                  Gravação das visitas (Clarity)
                </h2>
                <div className="grid grid-cols-2 items-end gap-x-5 gap-y-4 max-md:grid-cols-1">
                  <Campo rotulo="Código do Clarity">
                    <Input
                      placeholder="Ex.: abc1de23fg"
                      value={metaTracking.clarity_id}
                      onChange={e => setMetaTracking(prev => ({
                        ...prev,
                        clarity_id: e.target.value.replace(/[^a-zA-Z0-9]/g, ''),
                      }))}
                    />
                  </Campo>
                  <LinhaComChave
                    rotulo="Gravar visitas do cardápio"
                    ligado={metaTracking.clarity_enabled}
                    onMudar={(v) => setMetaTracking(prev => ({ ...prev, clarity_enabled: v }))}
                  />
                </div>
              </Card>
            )}

            {/* Recebimento e Nota fiscal ficam montados, só escondidos: são
                deles as alterações que a barra conta, e desmontar ao trocar de
                aba jogaria fora o que foi digitado sem aviso. */}
            {store?.id && (
              // Classe, não o atributo `hidden`: `flex` vence o display:none do
              // atributo, e o Recebimento aparecia embaixo de TODAS as abas (21/10).
              <div className={aba === 'recebimento' ? 'flex flex-col gap-6' : 'hidden'} data-aba="recebimento">
                <RecebimentoSection
                  storeId={store.id}
                  usaGatewayDaPlataforma={Boolean(
                    (store as unknown as { usa_gateway_da_plataforma?: boolean }).usa_gateway_da_plataforma,
                  )}
                />
                <VoucherSection storeId={store.id} />
                <ValePorLinkSection
                  storeId={store.id}
                  ligadas={
                    (store as unknown as { vale_por_link_brands?: string[] })
                      .vale_por_link_brands || []
                  }
                  whatsapp={store.whatsapp_number || ''}
                />
                <AcrescimoDoValeSection
                  storeId={store.id}
                  percentualAtual={Number(
                    (store as unknown as { voucher_fee_percent?: number }).voucher_fee_percent,
                  ) || 0}
                />
                <CaixaDinheiroSection loja={store} onSalvo={setStore} />
              </div>
            )}

            {store?.id && (
              <div className={aba === 'fiscal' ? undefined : 'hidden'} data-aba="fiscal">
                <NotaFiscalSection storeId={store.id} />
              </div>
            )}

            {aba === 'atendimento' && store?.id && (
              <AvisoFilaHumanaSection loja={store} onSalvo={setStore} />
            )}

            {aba === 'avaliacoes' && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-token">
                  <StarIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
                  Avaliações no Google
                </h2>
                <Campo
                  rotulo="Link de avaliação do Google"
                  dica={'No Perfil da Empresa no Google: "Pedir avaliações" → copiar link.'}
                >
                  <Input
                    type="url"
                    placeholder="https://g.page/r/SEU_CODIGO/review"
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  />
                </Campo>
              </Card>
            )}
          </div>
        )}
      </PageTabs>
      </SalvarJunto>

      <BarraDeAlteracoes
        quantidade={quantidade}
        salvando={saving}
        onSalvar={salvar}
        onDescartar={descartar}
      />
    </PageShell>
  );
};

/** Liga/desliga com o rótulo ao lado — no lugar dos checkboxes soltos. */
const LinhaComChave: React.FC<{ rotulo: string; ligado: boolean; onMudar: (v: boolean) => void }> = ({
  rotulo, ligado, onMudar,
}) => (
  <div className="flex h-10 items-center justify-between gap-3 rounded border border-border-token px-3">
    <span className="text-sm text-fg-token">{rotulo}</span>
    <Switch checked={ligado} onChange={onMudar} ariaLabel={rotulo} />
  </div>
);

export default StoreSettingsPage;
