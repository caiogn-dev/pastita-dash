/**
 * Impressão local (pastita-print-agent) — gestão de agentes e fila de jobs.
 * Backend: StorePrintAgentViewSet / StorePrintJobViewSet (rotas nested por loja).
 */
import api from './api';

export type SituacaoDoAgente = 'ok' | 'offline' | 'impressora_indisponivel';

export type PapelDoAgente = 'comanda' | 'recibo' | 'etiquetas';
export const PAPEIS_DO_AGENTE: { valor: PapelDoAgente; rotulo: string }[] = [
  { valor: 'comanda', rotulo: 'comanda' },
  { valor: 'recibo', rotulo: 'recibo' },
  { valor: 'etiquetas', rotulo: 'etiquetas' },
];
export const PAPEIS_PADRAO: PapelDoAgente[] = ['comanda', 'recibo'];

export interface PrintAgent {
  id: string;
  store: string;
  name: string;
  slug: string;
  status: string;
  station: string;
  platform: string;
  connection_mode: string;
  printer_name: string;
  printer_host: string | null;
  printer_port: number | null;
  poll_interval_seconds: number;
  last_seen_at: string | null;
  last_seen_ip: string | null;
  last_error: string;
  app_version: string;
  host_name: string;
  is_online: boolean;
  is_active: boolean;
  /** Impressoras detectadas no PC do agent (via heartbeat) */
  available_printers?: string[];
  /** O que este agent imprime. Backend antigo não manda: vale comanda + recibo. */
  imprime?: PapelDoAgente[];
  /**
   * Situação calculada pelo vigia de impressão do backend. Opcional: backend
   * antigo não manda, e aí nenhuma faixa acende.
   */
  situacao?: SituacaoDoAgente;
  /** Desde quando está nessa situação (ISO). `null` quando `ok`. */
  situacao_desde?: string | null;
  /** Frase pronta para o lojista, ex. "EPSON TM-T20 não responde — 10 impressões presas no Windows". */
  situacao_detalhe?: string;
  versao_desatualizada?: boolean;
  /** Versão mais nova do programa de impressão. */
  versao_atual?: string;
  created_at: string;
  /** Presente apenas na resposta de criação/rotação — chave exibida uma única vez */
  api_key?: string;
}

export interface PrintJob {
  id: string;
  order: string | null;
  order_number: string | null;
  status: string;
  station: string;
  template: string;
  title: string;
  claimed_by_name: string | null;
  printed_at: string | null;
  failed_at: string | null;
  attempts: number;
  last_error: string;
  created_at: string;
}

// Rotas GLOBAIS do router (/stores/print-agents/ e /stores/print-jobs/),
// filtradas por loja via ?store={slug}. As variantes por caminho
// (/stores/{slug}/print-agents/ e /stores/stores/{pk}/...) não existem ou
// exigem wrapper no backend — era a causa dos 404 na tela de Impressão.

export const listPrintAgents = (storeSlug: string) =>
  api.get('/stores/print-agents/', { params: { store: storeSlug } });

/** `data.store` deve ser o UUID da loja (FK do serializer). */
export const createPrintAgent = (
  _storeSlug: string,
  data: Partial<PrintAgent> & { name: string; store: string },
) => api.post('/stores/print-agents/', data);

export const updatePrintAgent = (_storeSlug: string, agentId: string, data: Partial<PrintAgent>) =>
  api.patch(`/stores/print-agents/${agentId}/`, data);

export const rotatePrintAgentKey = (_storeSlug: string, agentId: string) =>
  api.post(`/stores/print-agents/${agentId}/rotate-key/`, {});

export const deletePrintAgent = (_storeSlug: string, agentId: string) =>
  api.delete(`/stores/print-agents/${agentId}/`);

export const listPrintJobs = (storeSlug: string, params?: { page?: number }) =>
  api.get('/stores/print-jobs/', { params: { store: storeSlug, ...params } });

export const requeuePrintJob = (_storeSlug: string, jobId: string) =>
  api.post(`/stores/print-jobs/${jobId}/requeue/`, {});

/**
 * Etiqueta remota: o backend converte os dados em ZPL e enfileira para a
 * Zebra de UM agent (nunca "qualquer agent da loja" — cairia na Epson).
 * `etiquetas` é o mesmo objeto que alimenta a impressão pelo navegador.
 */
export interface EnvioDeEtiquetas {
  /** UUID da loja (FK). */
  store: string;
  /** UUID do agent escolhido. */
  agent: string;
  modelo: 'validade' | 'nutricao' | 'nutricao-qr';
  etiquetas: unknown[];
  config?: Record<string, unknown>;
}

export const enviarEtiquetasParaAgente = (dados: EnvioDeEtiquetas) =>
  api.post<{ job: PrintJob }>('/stores/print-jobs/etiquetas/', dados);

/** Papéis do agent; backend antigo (sem o campo) = comanda + recibo. */
export const papeisDoAgente = (agent: Pick<PrintAgent, 'imprime'>): PapelDoAgente[] =>
  Array.isArray(agent.imprime) ? agent.imprime : PAPEIS_PADRAO;

/** Só quem está marcado com "etiquetas" recebe ZPL — na Epson sairia lixo. */
export const imprimeEtiquetas = (agent: Pick<PrintAgent, 'imprime'>): boolean =>
  papeisDoAgente(agent).includes('etiquetas');
