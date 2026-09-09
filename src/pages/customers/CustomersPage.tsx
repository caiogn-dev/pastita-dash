import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  PhoneIcon,
  EnvelopeIcon,
  ShoppingBagIcon,
  CheckBadgeIcon,
  SparklesIcon,
  NoSymbolIcon,
  UserGroupIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  TagIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
// Os dois lados somam: o kebab/linha clicável desta sessão e o EmptyState de
// erro dos KPIs que o bot trouxe. Nenhum substitui o outro.
import { PageLoading, EmptyState } from '../../components/common';
import {
  Card, Button, Badge, RowActions, Input,
  PageShell, KpiGrid, InsightList, Tabela, SearchInput,
} from '../../components/ui';
import { insightsDeClientes } from './insightsDeClientes';
import { rotuloDeDias, rotuloDePerfil, type TomDeCrm } from './rotulosDeCrm';
import { getErrorMessage } from '../../services';
import { StoreCustomer, StoreCustomerAddress, createCustomer, updateCustomer } from '../../services/storesApi';
import { useStore, useDebounce } from '../../hooks';
import { useCustomers } from '../../hooks/queries/useCustomers';
import { useCustomerStats } from '../../hooks/queries/useCustomerStats';
import { useCustomerOrders } from '../../hooks/queries/useCustomerOrders';
import { getAvatarColor, getInitials } from '../../utils/avatar';
import { publicEmail } from '../../utils/internalEmail';
import { buscaInicialDaUrl } from './buscaPelaUrl';
import { segmentoPorTelefone } from './segmentoDoCliente';
import { useAnalyticsReport } from '../../hooks/queries/useReports';
import type { RfmReport, DateRange } from '../../services/reports';
import { useOrderDetailModal } from '../../hooks/useOrderDetailModal';
import { useSaldoDoCliente } from '../../hooks/queries/useSaldoDoCliente';
import { cashbackService, type CashbackClienteRow } from '../../services/cashback';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import { formatCurrency, formatPhone, formatPhoneForWhatsApp } from '../../utils/formatters';
import { buscarCep } from '../../services/cep';

/**
 * Telefone como uma PESSOA lê, para dentro do campo de edição.
 *
 * `formatPhone` devolve '-' para vazio, o que num input viraria o texto "-"
 * a ser apagado antes de digitar. Aqui vazio é vazio.
 */
function formatPhoneParaEdicao(valor?: string | null): string {
  if (!valor) return '';
  const formatado = formatPhone(valor);
  return formatado === '-' ? valor : formatado;
}

/**
 * O que vai para o backend: só dígitos, com o DDI que o resto do sistema usa.
 *
 * A máscara é da tela. Quem consome o campo é o WhatsApp e o casamento do
 * pedido por telefone — ambos comparam número, não pontuação.
 */
function telefoneParaEnvio(valor: string): string {
  return formatPhoneForWhatsApp(valor);
}
import { Loading } from '../../components/common';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

/**
 * Janela do relatório de RFM usada na ficha: 90 dias.
 *
 * O segmento precisa de HISTÓRIA. Com 30 dias, todo cliente que não pediu no
 * mês vira "perdido" — inclusive quem compra a cada 45, que é ritmo normal
 * numa saladeria. 90d é o maior preset abaixo de um ano e dá margem para
 * distinguir "sumiu" de "ainda não voltou".
 */
const PERIODO_DO_SEGMENTO: DateRange = { period: '90d' };

/** O que cada segmento significa em uma linha — o rótulo sozinho não age. */
const SEGMENTO_NA_FICHA: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; dica: string }> = {
  campeoes:   { label: 'Campeão',  tone: 'success', dica: 'compra muito e recente' },
  leais:      { label: 'Leal',     tone: 'success', dica: 'volta sempre' },
  novos:      { label: 'Novo',     tone: 'neutral', dica: 'primeira compra recente' },
  em_risco:   { label: 'Em risco', tone: 'warning', dica: 'comprava e parou' },
  perdidos:   { label: 'Perdido',  tone: 'danger',  dica: 'sumiu faz tempo' },
  sem_pedido: { label: 'Sem pedido', tone: 'neutral', dica: 'cadastrado, nunca comprou' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};

/** Cor da célula "sem comprar". O texto já diz tudo — a cor só apressa a varredura. */
const TOM_CRM: Record<TomDeCrm, string> = {
  neutro: 'text-fg-muted-token',
  atencao: 'text-[var(--warning)]',
  perigo: 'text-[var(--danger)]',
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', preparing: 'Preparando',
  out_for_delivery: 'Em entrega', delivered: 'Entregue', cancelled: 'Cancelado',
  ready: 'Pronto', completed: 'Concluído', failed: 'Falhou',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  preparing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  out_for_delivery: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// ─── Customer Form Drawer ─────────────────────────────────────────────────────

export interface CustomerFormDrawerProps {
  storeSlug?: string;
  customer?: StoreCustomer | null;
  onClose: () => void;
  onSaved: () => void;
}

export const CustomerFormDrawer: React.FC<CustomerFormDrawerProps> = ({ storeSlug, customer, onClose, onSaved }) => {
  const [name, setName] = useState(customer?.user_name ?? '');
  // O telefone é EXIBIDO formatado e ENVIADO em dígitos. O painel mostrava
  // "5563999192628" num campo de cadastro, que é o número como o banco guarda
  // — não como uma pessoa lê ou confere.
  const [phone, setPhone] = useState(formatPhoneParaEdicao(customer?.phone));
  const [whatsapp, setWhatsapp] = useState(formatPhoneParaEdicao(customer?.whatsapp));
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [aceitaMarketing, setAceitaMarketing] = useState(Boolean(customer?.accepts_marketing));
  const [saving, setSaving] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const isEdit = Boolean(customer);

  // O endereço editável é o PADRÃO (`Meta.ordering = ['-is_default', …]`);
  // os demais viajam intactos no payload — ver `outrosEnderecos`.
  const addr0 = customer?.address_list?.[0];
  /**
   * Os outros endereços do cliente, preservados na íntegra.
   *
   * `_sync_address_list` no backend é replace-all: apaga todo endereço que não
   * vier no payload. O formulário edita um só, então sem carregar os demais
   * junto uma correção de nome DELETAVA os outros — 22 dos 85 clientes da Cê
   * Saladas têm 2 ou mais. Não é enfeite: é o que impede perda de dado.
   */
  const outrosEnderecos = (customer?.address_list ?? []).slice(1);
  const [street, setStreet] = useState(addr0?.street ?? '');
  const [number, setNumber] = useState(addr0?.number ?? '');
  const [complement, setComplement] = useState(addr0?.complement ?? '');
  const [neighborhood, setNeighborhood] = useState(addr0?.neighborhood ?? '');
  const [city, setCity] = useState(addr0?.city ?? '');
  const [uf, setUf] = useState(addr0?.state ?? '');
  const [zip, setZip] = useState(addr0?.zip_code ?? '');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroDoCep, setErroDoCep] = useState<string | null>(null);

  /**
   * CEP completo preenche rua, bairro, cidade e UF.
   *
   * Sete campos digitados na mão viravam quatro erros de digitação. O ViaCEP
   * falhando não trava nada: a mensagem aparece e os campos seguem editáveis.
   */
  const aoDigitarCep = async (valor: string) => {
    setZip(valor);
    setErroDoCep(null);
    const digits = valor.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setBuscandoCep(true);
    try {
      const achado = await buscarCep(digits);
      if (!achado) {
        setErroDoCep('CEP não encontrado — preencha à mão');
        return;
      }
      // Rua e número já digitados não são sobrescritos: quem digitou sabe
      // mais que o ViaCEP sobre o complemento daquela entrega.
      setStreet((atual) => atual || achado.street);
      setNeighborhood((atual) => atual || achado.neighborhood);
      setCity(achado.city);
      setUf(achado.state);
    } finally {
      setBuscandoCep(false);
    }
  };

  const buildAddressList = (): StoreCustomerAddress[] | undefined => {
    const filled = street || number || neighborhood || city || zip;
    // Sem nada preenchido e sem outros endereços, `undefined` mantém o
    // comportamento antigo: o backend não recebe a chave e não mexe em nada.
    if (!filled) return outrosEnderecos.length ? [...outrosEnderecos] : undefined;
    const addr: StoreCustomerAddress = {
      street, number, complement, neighborhood, city, state: uf, zip_code: zip, is_default: true,
    };
    if (addr0?.id) addr.id = addr0.id;
    return [addr, ...outrosEnderecos];
  };

  /**
   * A validação que faltava.
   *
   * O formulário salvava nome vazio e telefone com duas letras. O cadastro
   * ruim só aparece semanas depois, quando a campanha não entrega e o pedido
   * não acha o cliente.
   */
  const validar = (): Record<string, string> => {
    const achados: Record<string, string> = {};
    if (!name.trim()) achados.name = 'Nome é obrigatório';
    const digitos = (t: string) => t.replace(/\D/g, '');
    if (phone.trim() && digitos(phone).length < 10) achados.phone = 'Telefone incompleto';
    if (whatsapp.trim() && digitos(whatsapp).length < 10) achados.whatsapp = 'WhatsApp incompleto';
    if (uf.trim() && uf.trim().length !== 2) achados.uf = 'UF tem 2 letras';
    if (zip.trim() && digitos(zip).length !== 8) achados.zip = 'CEP tem 8 dígitos';
    return achados;
  };

  const handleSave = async () => {
    if (saving) return;
    const achados = validar();
    setErros(achados);
    if (Object.keys(achados).length) return;
    setSaving(true);
    try {
      const address_list = buildAddressList();
      const payload = {
        name,
        // Dígitos, nunca a máscara: quem consome isto é o WhatsApp e o
        // casamento por telefone do checkout.
        phone: telefoneParaEnvio(phone),
        whatsapp: telefoneParaEnvio(whatsapp),
        notes,
        accepts_marketing: aceitaMarketing,
        ...(address_list ? { address_list } : {}),
      };
      if (isEdit && customer) {
        await updateCustomer(customer.id, payload);
      } else {
        await createCustomer(storeSlug, payload);
      }
      toast.success(isEdit ? 'Cliente atualizado' : 'Cliente criado');
      onSaved();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-surface border-l border-border-token shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-token">
          <p className="font-bold text-fg-token">{isEdit ? 'Editar cliente' : 'Novo cliente'}</p>
          <button onClick={onClose} aria-label="Fechar" className="p-2 rounded text-fg-muted-token hover:text-fg-token hover:bg-surface-2">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* QUEM está sendo editado. O formulário não dizia nada sobre a pessoa
            — os mesmos números da ficha, aqui, evitam editar às cegas. */}
        {isEdit && customer && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-token bg-surface-2 px-6 py-3 text-xs text-fg-muted-token">
            <span className="font-semibold text-fg-token">
              {customer.pedidos_reais ?? customer.total_orders ?? 0} pedidos
            </span>
            <span className="font-semibold text-fg-token">
              {formatCurrency(customer.gasto_real ?? Number(customer.total_spent ?? 0))}
            </span>
            <span>{rotuloDeDias(customer.dias_sem_comprar).texto}</span>
            <span>cliente desde {formatDate(customer.created_at)}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <Input
            label="Nome"
            value={name}
            error={erros.name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Telefone"
            inputMode="tel"
            value={phone}
            error={erros.phone}
            hint="Usado para casar o pedido com o cadastro"
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhone(formatPhoneParaEdicao(telefoneParaEnvio(phone)))}
          />
          <Input
            label="WhatsApp"
            inputMode="tel"
            value={whatsapp}
            error={erros.whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            onBlur={() => setWhatsapp(formatPhoneParaEdicao(telefoneParaEnvio(whatsapp)))}
          />
          <div>
            <label htmlFor="cf-notes" className="mb-1.5 block text-sm font-medium text-fg-token">Notas</label>
            <textarea
              id="cf-notes"
              rows={3}
              className="w-full rounded-xl border border-border-token bg-surface px-4 py-2.5 text-sm text-fg-token focus:border-brand focus:outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Consentimento de marketing: o campo existe no backend e é a base
              legal das campanhas, mas não havia onde ler nem mudar. */}
          <label className="flex items-start gap-3 rounded-xl border border-border-token p-3 text-sm text-fg-token">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              checked={aceitaMarketing}
              onChange={(e) => setAceitaMarketing(e.target.checked)}
            />
            <span>
              Aceita receber campanhas
              <span className="mt-0.5 block text-xs text-fg-muted-token">
                {customer?.marketing_opt_in_at
                  ? `Consentimento registrado em ${formatDate(customer.marketing_opt_in_at)}`
                  : 'Sem consentimento registrado'}
              </span>
            </span>
          </label>

          <div className="space-y-3 border-t border-border-token pt-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-fg-muted-token">
                {outrosEnderecos.length ? 'Endereço padrão' : 'Endereço'}
              </p>
              {/* Quem vê um formulário com um endereço só assume que o cliente
                  tem um. Dizer quantos ficaram guardados evita que o dono
                  redigite aqui um endereço que já existe na conta. */}
              {outrosEnderecos.length > 0 && (
                <p className="text-xs text-fg-muted-token">
                  mais {outrosEnderecos.length} endereço{outrosEnderecos.length > 1 ? 's' : ''} salvo{outrosEnderecos.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <Input
              label="CEP"
              inputMode="numeric"
              value={zip}
              error={erros.zip}
              hint={buscandoCep ? 'Buscando endereço…' : (erroDoCep ?? 'Preenche rua, bairro e cidade')}
              onChange={(e) => aoDigitarCep(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input label="Rua" value={street} onChange={(e) => setStreet(e.target.value)} />
              </div>
              <Input label="Número" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <Input label="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} />
            <Input label="Bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <Input
                label="UF"
                maxLength={2}
                value={uf}
                error={erros.uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border-token flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-border-token text-sm font-semibold text-fg-token hover:bg-surface-2">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Customer Drawer ──────────────────────────────────────────────────────────

interface CustomerDrawerProps {
  customer: StoreCustomer | null;
  onClose: () => void;
  onEdit?: (customer: StoreCustomer) => void;
  /**
   * Segmento RFM (campeão, em risco, perdido…), resolvido pelo pai.
   *
   * Opcional: sem ele a ficha só não mostra o selo. Nenhuma tela deve deixar
   * de abrir porque um relatório de apoio não respondeu.
   */
  segmento?: string | null;
  /**
   * Saldo de cashback, buscado pelo PAI.
   *
   * Mesma regra do `segmento`: buscar aqui dentro faria uma consulta por ficha
   * aberta e obrigaria todo teste que monta o drawer isolado a carregar um
   * QueryClient só por causa disso — o arquivo já avisava e eu quebrei a regra
   * uma vez (05/09).
   */
  saldo?: CashbackClienteRow | null;
  /** Avisa o pai que o saldo mudou, para ele refazer a consulta. */
  onAjustado?: () => void;
}

export const CustomerDrawer: React.FC<CustomerDrawerProps> = ({
  customer, onClose, onEdit, segmento = null, saldo = null, onAjustado,
}) => {
  const { storeId, storeSlug } = useStore();
  const storeQuery = storeSlug || storeId;
  const navigate = useNavigate();

  // Pedidos filtrados server-side por telefone (?customer=<phone>) — sem baixar 200.
  const customerPhone = customer?.phone || customer?.whatsapp || '';
  const ordersQuery = useCustomerOrders(storeQuery, customerPhone);

  // O segmento chega PRONTO do pai, não buscado aqui.
  //
  // Buscar o relatório de RFM dentro do drawer significaria uma consulta por
  // ficha aberta para exibir um selo — e obrigaria todo teste que monta o
  // drawer isolado a carregar um QueryClient só por causa disso. O pai já
  // busca uma vez para a página inteira.
  const orders = ordersQuery.data?.results ?? [];
  // Mesma convenção do kanban: o detalhe do pedido é um modal em `?pedido=`.
  const { openOrder } = useOrderDetailModal();

  const loadingOrders = ordersQuery.isLoading && ordersQuery.fetchStatus !== 'idle';

  /**
   * Os indicadores saem dos MESMOS pedidos que a tabela abaixo mostra.
   *
   * Vinham de `total_orders`/`total_spent`, contadores gravados no cadastro
   * que ninguém mantém: a ficha do Vinicius dizia "0 pedidos, R$ 0,00" com o
   * pedido de R$ 36,99 listado logo abaixo, na mesma tela (04/09). Duas
   * fontes discordando na mesma janela é pior que não ter o número — quem lê
   * não sabe em qual acreditar.
   *
   * Cancelado não conta como venda; o histórico continua listando tudo,
   * porque lá o assunto é o que aconteceu, não o que a loja faturou.
   */
  const resumoDosPedidos = useMemo(() => {
    const pagos = orders.filter((o) => o.status !== 'cancelled');
    const gasto = pagos.reduce((t, o) => t + Number(o.total || 0), 0);
    return {
      pedidos: pagos.length,
      gasto,
      ticket: pagos.length ? gasto / pagos.length : 0,
    };
  }, [orders]);

  // Ajuste de saldo pela própria ficha. Antes só existia na tela de
  // Fidelidade, com o telefone digitado à mão: a ficha mostrava o número do
  // cliente e não deixava mexer nele.
  const [ajusteAberto, setAjusteAberto] = useState(false);
  const [valorDoAjuste, setValorDoAjuste] = useState('');
  const [motivoDoAjuste, setMotivoDoAjuste] = useState('');
  const [ajustando, setAjustando] = useState(false);

  const aplicarAjuste = async (sinal: 1 | -1) => {
    const telefone = customer?.whatsapp || customer?.phone || '';
    const valor = valorDoAjuste.replace(',', '.').trim();
    // `motivo` é obrigatório no backend de propósito: crédito sem
    // justificativa é o buraco por onde some dinheiro num programa de
    // fidelidade. A trava vive aqui também para não gastar a ida ao servidor.
    if (!telefone || !valor || Number(valor) <= 0 || !motivoDoAjuste.trim() || ajustando) return;
    setAjustando(true);
    try {
      await cashbackService.ajustar(String(storeQuery), {
        phone: telefone,
        valor: sinal > 0 ? valor : `-${valor}`,
        motivo: motivoDoAjuste.trim(),
      });
      toast.success(sinal > 0 ? 'Saldo creditado' : 'Saldo debitado');
      setValorDoAjuste('');
      setMotivoDoAjuste('');
      setAjusteAberto(false);
      onAjustado?.();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setAjustando(false);
    }
  };

  const whatsappNumber = customer?.whatsapp || customer?.phone || '';
  const cleanPhone = whatsappNumber.replace(/\D/g, '');

  if (!customer) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-lg bg-surface border-l border-border-token shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-token">
          <div className="flex items-center gap-3">
            {(() => {
              const bg = getAvatarColor(customer.user_name || customer.user_email || '');
              const initials = getInitials(customer.user_name, customer.whatsapp || customer.phone);
              return (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: bg }}>
                  {initials}
                </div>
              );
            })()}
            <div>
              <p className="font-bold text-fg-token leading-tight">{customer.user_name || '—'}</p>
              <p className="text-xs text-fg-muted-token">
                Cliente desde {formatDate(customer.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded text-fg-muted-token hover:text-fg-token hover:bg-surface-2 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 divide-x divide-border-token border-b border-border-token">
          <div className="px-4 py-3 text-center">
            <p className="overline mb-1">Gasto total</p>
            <p className="text-lg font-bold text-brand-ink">
              {formatCurrency(resumoDosPedidos.gasto)}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="overline mb-1">Pedidos</p>
            <p className="text-lg font-bold text-fg-token">{resumoDosPedidos.pedidos}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="overline mb-1">Ticket médio</p>
            <p className="text-lg font-bold text-fg-token">{formatCurrency(resumoDosPedidos.ticket)}</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Contact */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">Contato</p>
            <div className="rounded border border-border-token divide-y divide-border-token overflow-hidden">
              {(customer.whatsapp || customer.phone) && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <PhoneIcon className="h-4 w-4 text-fg-muted-token shrink-0" />
                  <span className="text-sm text-fg-token">
                    {formatPhone(customer.whatsapp || customer.phone)}
                  </span>
                </div>
              )}
              {publicEmail(customer.user_email) && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <EnvelopeIcon className="h-4 w-4 text-fg-muted-token shrink-0" />
                  <span className="text-sm text-fg-token">{publicEmail(customer.user_email)}</span>
                </div>
              )}
              {customer.last_order_at && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <CalendarDaysIcon className="h-4 w-4 text-fg-muted-token shrink-0" />
                  <span className="text-sm text-fg-token">
                    Último pedido {formatDistanceToNow(new Date(customer.last_order_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              )}
              {segmento && SEGMENTO_NA_FICHA[segmento] && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <SparklesIcon className="h-4 w-4 text-fg-muted-token shrink-0" />
                  <span className="flex items-center gap-2 text-sm text-fg-token">
                    <Badge tone={SEGMENTO_NA_FICHA[segmento].tone}>
                      {SEGMENTO_NA_FICHA[segmento].label}
                    </Badge>
                    <span className="text-fg-muted-token">
                      {SEGMENTO_NA_FICHA[segmento].dica}
                    </span>
                  </span>
                </div>
              )}
              {customer.tags?.length > 0 && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <TagIcon className="h-4 w-4 text-fg-muted-token shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {customer.tags.map(tag => (
                      <Badge key={tag} tone="success">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cashback — sempre presente enquanto a loja usa o programa.
              Escondê-lo com saldo zero deixava "cliente sem saldo" e "a loja
              não tem cashback" com exatamente a mesma cara — e o telefone
              gravado em outra grafia (com/sem o nono dígito) cai no mesmo
              zero, o que fazia a ficha mentir em silêncio. */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">
                Cashback
              </p>
              <button
                type="button"
                onClick={() => setAjusteAberto((v) => !v)}
                className="text-xs font-semibold text-brand-ink hover:underline"
              >
                Ajustar saldo
              </button>
            </div>
            <div className="rounded border border-border-token px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-bold text-brand-ink">
                  {formatCurrency(saldo?.saldo ?? 0)}
                </span>
                {saldo && Number(saldo.saldo) > 0 && (
                  <span className="text-xs text-fg-muted-token">
                    {saldo.dias_para_vencer === 0
                      ? 'vence hoje'
                      : `vence em ${saldo.dias_para_vencer} dia${saldo.dias_para_vencer > 1 ? 's' : ''}`}
                  </span>
                )}
              </div>
              {saldo && (Number(saldo.saldo_carteira) > 0 || saldo.cupons_entrega > 0) && (
                <p className="mt-1.5 text-xs text-fg-muted-token">
                  {Number(saldo.saldo_carteira) > 0 && (
                    // O comprado separado do concedido: são dinheiros
                    // diferentes e só um deles a loja ainda deve.
                    <>{formatCurrency(saldo.saldo_carteira)} são de carteira comprada</>
                  )}
                  {Number(saldo.saldo_carteira) > 0 && saldo.cupons_entrega > 0 && ' · '}
                  {saldo.cupons_entrega > 0 && (
                    <>{saldo.cupons_entrega} entrega{saldo.cupons_entrega > 1 ? 's' : ''} grátis</>
                  )}
                </p>
              )}

              {ajusteAberto && (
                <div className="mt-3 space-y-2 border-t border-border-token pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      label="Valor"
                      inputMode="decimal"
                      placeholder="10,00"
                      value={valorDoAjuste}
                      onChange={(e) => setValorDoAjuste(e.target.value)}
                    />
                    <div className="col-span-2">
                      <Input
                        label="Motivo"
                        placeholder="cortesia pelo atraso"
                        value={motivoDoAjuste}
                        onChange={(e) => setMotivoDoAjuste(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" isLoading={ajustando} onClick={() => aplicarAjuste(1)}>
                      Creditar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={ajustando}
                      onClick={() => aplicarAjuste(-1)}
                    >
                      Debitar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order history */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">
              Histórico de pedidos
            </p>
            {!customerPhone ? (
              <div className="text-center py-8 rounded border border-dashed border-border-token">
                <PhoneIcon className="h-7 w-7 mx-auto mb-2 text-fg-muted-token" />
                <p className="text-sm text-fg-muted-token">Cliente sem telefone</p>
              </div>
            ) : loadingOrders ? (
              <div className="flex justify-center py-8">
                <Loading size="sm" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 rounded border border-dashed border-border-token">
                <ShoppingBagIcon className="h-7 w-7 mx-auto mb-2 text-fg-muted-token" />
                <p className="text-sm text-fg-muted-token">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <Tabela<(typeof orders)[number]>
                itens={orders.slice(0, 15)}
                chave={(o) => String(o.id)}
                rotuloDaLinha={(o) => `Abrir pedido ${o.order_number}`}
                // Abre o MESMO modal de detalhe do kanban (`?pedido=<id>`): o
                // dono clicava na linha esperando ver itens e frete e não
                // acontecia nada.
                onAbrir={(o) => openOrder(String(o.id))}
                colunas={[
                  {
                    chave: 'numero',
                    cabecalho: 'Pedido',
                    render: (o) => (
                      <span className="font-mono text-xs font-semibold">#{o.order_number}</span>
                    ),
                  },
                  {
                    chave: 'data',
                    cabecalho: 'Data',
                    classe: 'max-sm:hidden',
                    render: (o) => (
                      <span className="text-xs text-fg-muted-token">{formatDate(o.created_at)}</span>
                    ),
                  },
                  {
                    chave: 'status',
                    cabecalho: 'Status',
                    render: (o) => (
                      <span
                        className={`text-badge rounded px-2 py-0.5 font-semibold ${
                          STATUS_COLOR[o.status] ?? 'bg-surface-2 text-fg-muted-token'
                        }`}
                      >
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    ),
                  },
                  {
                    chave: 'total',
                    cabecalho: 'Total',
                    alinhamento: 'direita',
                    render: (o) => <span className="font-bold">{formatCurrency(o.total)}</span>,
                  },
                ]}
              />
            )}
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">Observações</p>
              <p className="text-sm text-fg-muted-token bg-surface-2 rounded p-4 leading-relaxed">
                {customer.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border-token flex gap-2">
          {onEdit && (
            <Button
              className="flex-1 justify-center"
              onClick={() => { onClose(); onEdit(customer); }}
            >
              Editar
            </Button>
          )}
          {cleanPhone && (
            <Button
              className="flex-1 justify-center"
              leftIcon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
              onClick={() => {
                onClose();
                // Rota viva do inbox; WhatsAppInboxPage lê `?search` (não `?phone`).
                navigate(`/inbox/whatsapp?search=${cleanPhone}`);
              }}
            >
              Iniciar conversa WhatsApp
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────


// ─── Main Component ───────────────────────────────────────────────────────────

export const CustomersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { storeId, storeSlug } = useStore();

  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Math.max(1, pageParam);

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set('page', String(p)); else next.delete('page');
      return next;
    });
  };

  // A busca nasce da URL: é o que faz o link do relatório ("Fulana, em risco")
  // chegar aqui JÁ filtrado. Sem isso o link cai na lista inteira e a pessoa
  // apontada some no meio da base — o dono procura na mão de novo, que é
  // exatamente o trabalho que o link deveria ter eliminado.
  //
  // De quebra, o filtro passa a sobreviver ao F5 e a ser compartilhável.
  const [search, setSearch] = useState(() => buscaInicialDaUrl(searchParams));
  const debouncedSearch = useDebounce(search.trim(), 400);

  // Espelha o termo na URL depois do debounce — não a cada tecla, senão o
  // histórico do navegador vira uma entrada por letra digitada.
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) next.set('busca', debouncedSearch);
      else next.delete('busca');
      return next;
    }, { replace: true });
  }, [debouncedSearch, setSearchParams]);

  const storeQuery = storeSlug || storeId;

  // Lista paginada + busca server-side (count/results vêm do backend).
  const customersQuery = useCustomers(storeQuery, debouncedSearch, page, PAGE_SIZE);

  const customers = customersQuery.data?.results ?? [];
  const totalCount = customersQuery.data?.count ?? 0;

  // KPIs agregados pelo backend (sem reduce/filter sobre a página).
  const statsQuery = useCustomerStats(storeQuery);
  const kpis = {
    total: statsQuery.data?.total ?? 0,
    active: statsQuery.data?.active ?? 0,
    withOrders: statsQuery.data?.with_orders ?? 0,
    totalRevenue: Number(statsQuery.data?.total_revenue ?? 0),
  };

  // Os segmentos são o que transforma a lista em ferramenta de reengajamento:
  // "12 em risco, 30 a 45 dias sem comprar" dá para agir hoje; "2.386
  // cadastrados" não.
  const insights = useMemo(
    () => insightsDeClientes(statsQuery.data?.segmentos),
    [statsQuery.data?.segmentos]
  );

  // Erro isolado da seção de KPIs: sem isto, uma falha do endpoint de stats
  // deixava os cards com zeros ("Total 0", "Receita total R$ 0,00"), enganando
  // o lojista a achar que perdeu todos os clientes/faturamento. Só tratamos como
  // falha quando NÃO há dado em cache — com cache, mantemos os números anteriores.
  const statsFailed = statsQuery.isError && statsQuery.data === undefined;

  useEffect(() => {
    if (customersQuery.error) toast.error(getErrorMessage(customersQuery.error));
  }, [customersQuery.error]);

  const refreshing = customersQuery.isFetching || statsQuery.isFetching;
  const refresh = () => {
    customersQuery.refetch();
    statsQuery.refetch();
  };

  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState<StoreCustomer | null>(null);
  // RFM buscado UMA vez para a página, e só quando existe ficha aberta: é o
  // único lugar que usa o segmento, e a lista não deve pagar a consulta.
  const rfm = useAnalyticsReport<RfmReport>(
    'rfm', PERIODO_DO_SEGMENTO, Boolean(selectedCustomer),
  );
  // O cashback vinha só na tela de Fidelidade: para saber o saldo de alguém o
  // dono saía da ficha, abria outra página e procurava o telefone na lista.
  const saldoQuery = useSaldoDoCliente(
    storeSlug ?? storeId,
    selectedCustomer?.whatsapp || selectedCustomer?.phone || null,
  );
  const saldoDoSelecionado = saldoQuery.data ?? null;

  const segmentoDoSelecionado = segmentoPorTelefone(
    rfm.data?.customers ?? [],
    selectedCustomer?.phone || selectedCustomer?.whatsapp || '',
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<StoreCustomer | null>(null);

  if (customersQuery.isLoading) return <PageLoading />;

  return (
    <>
    <PageShell
      titulo="Clientes"
      acoes={
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Atualizar clientes"
            onClick={refresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-surface border border-border-token text-fg-muted-token hover:text-fg-token hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={() => { setEditingCustomer(null); setFormOpen(true); }}>
            Novo cliente
          </Button>
        </div>
      }
      filtros={
        <SearchInput
          className="w-72 max-sm:w-full"
          placeholder="Buscar por nome, e-mail ou telefone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (page !== 1) setPage(1);
          }}
        />
      }
    >

      {/* ── KPIs ── */}
      {statsFailed ? (
        <Card>
          <EmptyState
            icon={<ExclamationTriangleIcon className="h-8 w-8 text-[var(--danger)]" />}
            title="Não foi possível carregar os indicadores"
            description="Os totais de clientes e receita não puderam ser carregados. Tente novamente."
            action={{ label: 'Tentar novamente', onClick: refresh }}
          />
        </Card>
      ) : (
        <KpiGrid
          itens={[
            { label: 'Total', value: kpis.total, definicao: 'cadastros nesta loja, comprando ou não' },
            { label: 'Ativos', value: kpis.active, tone: 'brand', definicao: 'cadastro habilitado a pedir' },
            { label: 'Com pedidos', value: kpis.withOrders, definicao: 'já fizeram ao menos uma compra' },
            {
              label: 'Receita total',
              value: formatCurrency(kpis.totalRevenue),
              tone: 'brand',
              definicao: 'soma dos pedidos pagos de todos os clientes',
            },
          ]}
        />
      )}

      {insights.length > 0 && (
        <InsightList
          titulo="Sua base agora"
          descricao="Cada grupo pede uma conversa diferente — a régua vai escrita."
          tom={insights.some((i) => i.direcao === 'baixa') ? 'alerta' : 'neutro'}
          itens={insights.map((i) => ({
            direcao: i.direcao,
            titulo: i.titulo,
            valor: i.valor,
            recomendacao: i.recomendacao,
            // Reativação sai daqui direto para onde se cria a oferta. Sem isso
            // o diagnóstico morre em texto e o operador precisa lembrar onde
            // ficam os cupons.
            acao:
              i.chave === 'saudavel'
                ? undefined
                : { rotulo: 'Criar cupom', onClick: () => navigate(storeSlug ? `/stores/${storeSlug}/coupons` : '/') },
          }))}
        />
      )}

      <Tabela<(typeof customers)[number]>
        itens={customers}
        chave={(c) => String(c.id)}
        rotuloDaLinha={(c) => `Abrir ${c.user_name || 'cliente'}`}
        onAbrir={setSelectedCustomer}
        carregando={customersQuery.isFetching}
        vazio={{
          titulo: 'Nenhum cliente encontrado',
          icone: <UserGroupIcon className="h-8 w-8" />,
        }}
        paginacao={{
          pagina: page,
          porPagina: PAGE_SIZE,
          total: totalCount,
          onPagina: setPage,
          rotulo: 'clientes',
        }}
        colunas={[
          {
            chave: 'cliente',
            cabecalho: 'Cliente',
            render: (c) => (
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(c.user_name || c.user_email || '') }}
                >
                  {getInitials(c.user_name, c.whatsapp || c.phone)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg-token">{c.user_name || '—'}</p>
                  <p className="truncate text-xs text-fg-muted-token">
                    {publicEmail(c.user_email) || ''}
                  </p>
                </div>
              </div>
            ),
          },
          {
            chave: 'contato',
            cabecalho: 'Contato',
            classe: 'max-md:hidden',
            render: (c) => (
              <div className="flex flex-col gap-1">
                {(c.phone || c.whatsapp) && (
                  <div className="flex items-center gap-1.5 text-xs text-fg-muted-token">
                    <PhoneIcon className="h-3 w-3 shrink-0" />
                    {formatPhone(c.whatsapp || c.phone)}
                  </div>
                )}
                {publicEmail(c.user_email) && (
                  <div className="flex items-center gap-1.5 text-xs text-fg-muted-token">
                    <EnvelopeIcon className="h-3 w-3 shrink-0" />
                    {publicEmail(c.user_email)}
                  </div>
                )}
              </div>
            ),
          },
          {
            chave: 'pedidos',
            cabecalho: 'Pedidos',
            alinhamento: 'centro',
            classe: 'max-lg:hidden',
            render: (c) => (
              <Badge tone="neutral" className="gap-1.5">
                <ShoppingBagIcon className="h-3 w-3" />
                {/* Campos derivados dos pedidos: os contadores gravados por
                    signal divergiram em 12 dos 78 clientes da Cê Saladas.
                    `??` e não `||` — zero real é resposta válida. */}
                {c.pedidos_reais ?? c.total_orders ?? 0}
              </Badge>
            ),
          },
          {
            chave: 'gasto',
            cabecalho: 'Gasto total',
            alinhamento: 'direita',
            classe: 'max-lg:hidden',
            render: (c) => {
              const gasto = c.gasto_real ?? Number(c.total_spent ?? 0);
              // O destaque acima de R$ 500 escapava do `formatCurrency` e caía
              // num `toFixed(2)` cru: "R$ 1152.33". Quem cruza o corte é o
              // cliente mais valioso — é a última linha que pode sair torta.
              return Number(gasto) > 500 ? (
                <Badge tone="success">{formatCurrency(gasto)}</Badge>
              ) : (
                <span className="font-bold text-fg-token">{formatCurrency(gasto)}</span>
              );
            },
          },
          {
            // "Último pedido" virou "Sem comprar": a data crua obriga cada
            // linha a uma subtração mental, e é a distância — não a data —
            // que decide quem recebe mensagem hoje.
            chave: 'sem_comprar',
            cabecalho: 'Sem comprar',
            classe: 'max-xl:hidden',
            render: (c) => {
              const dias = rotuloDeDias(c.dias_sem_comprar);
              return (
                <span
                  className={`text-xs font-semibold ${TOM_CRM[dias.tom]}`}
                  title={formatDate(c.last_order_at)}
                >
                  {dias.texto}
                </span>
              );
            },
          },
          {
            chave: 'perfil',
            cabecalho: 'Perfil',
            alinhamento: 'centro',
            classe: 'max-lg:hidden',
            render: (c) => {
              const perfil = rotuloDePerfil(c.perfil);
              // A régua no `title`: "VIP" sem critério é magia, e quem atende
              // precisa saber explicar por que aquele cliente é VIP.
              return (
                <Badge tone={c.perfil === 'vip' ? 'success' : 'neutral'} title={perfil.definicao}>
                  {perfil.texto}
                </Badge>
              );
            },
          },
          {
            chave: 'status',
            cabecalho: 'Status',
            alinhamento: 'centro',
            render: (c) =>
              c.is_active ? (
                <Badge tone="success" className="gap-1">
                  <CheckBadgeIcon className="h-3 w-3" />
                  Ativo
                </Badge>
              ) : (
                <Badge tone="neutral" className="gap-1">
                  <NoSymbolIcon className="h-3 w-3" />
                  Inativo
                </Badge>
              ),
          },
          {
            chave: 'acoes',
            cabecalho: 'Ações',
            alinhamento: 'direita',
            render: (c) => (
              // As três coisas que se faz com um cliente sem abrir o detalhe.
              // Falar no WhatsApp era o caso mais frequente e exigia abrir a
              // gaveta, copiar o número e ir para o inbox — três telas para
              // uma mensagem.
              <RowActions
                rotulo={`Ações de ${c.user_name || 'cliente'}`}
                acoes={[
                  { rotulo: 'Ver detalhes', onClick: () => setSelectedCustomer(c) },
                  {
                    rotulo: 'Editar',
                    onClick: () => {
                      setEditingCustomer(c);
                      setFormOpen(true);
                    },
                  },
                  {
                    rotulo: 'Falar no WhatsApp',
                    desabilitada: !(c.whatsapp || c.phone),
                    onClick: () =>
                      navigate(
                        `/inbox/whatsapp?search=${(c.whatsapp || c.phone || '').replace(/\D/g, '')}`,
                      ),
                  },
                ]}
              />
            ),
          },
        ]}
      />

    </PageShell>

    <CustomerDrawer
      customer={selectedCustomer}
      onClose={() => setSelectedCustomer(null)}
      onEdit={(c) => { setEditingCustomer(c); setFormOpen(true); }}
      segmento={segmentoDoSelecionado}
      saldo={saldoDoSelecionado}
      // O crédito acabou de ser lançado: sem refazer a consulta o bloco
      // continuaria mostrando o saldo de antes do ajuste.
      onAjustado={() => saldoQuery.refetch()}
    />
    {formOpen && (
      <CustomerFormDrawer
        storeSlug={storeSlug ?? storeId ?? undefined}
        customer={editingCustomer}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          customersQuery.refetch();
          statsQuery.refetch();
        }}
      />
    )}

    {/* O MESMO modal do kanban. A linha do histórico na ficha abre por
        `?pedido=<id>`; sem renderizar o modal aqui, o clique só mexeria na
        URL e nada apareceria. */}
    <OrderDetailModal />
    </>
  );
};

export default CustomersPage;
