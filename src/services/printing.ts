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
  /** Livre: alerta do vigia, calibração da etiqueta ({calibracao: {desloc_x, desloc_y, escuro}}). */
  metadata?: Record<string, unknown>;
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
  modelo: 'produto' | 'validade' | 'nutricao' | 'nutricao-qr';
  etiquetas: unknown[];
  config?: Record<string, unknown>;
  /** 'bitmap' = layout desenhado (mm → ^GFA), igual na Zebra e na Elgin. Sem isso, ZPL nativo antigo. */
  motor?: 'bitmap';
  layout?: LayoutDeEtiqueta;
}

export const enviarEtiquetasParaAgente = (dados: EnvioDeEtiquetas) =>
  api.post<{ job: PrintJob }>('/stores/print-jobs/etiquetas/', dados);

/** Papéis do agent; backend antigo (sem o campo) = comanda + recibo. */
export const papeisDoAgente = (agent: Pick<PrintAgent, 'imprime'>): PapelDoAgente[] =>
  Array.isArray(agent.imprime) ? agent.imprime : PAPEIS_PADRAO;

/** Só quem está marcado com "etiquetas" recebe ZPL — na Epson sairia lixo. */
export const imprimeEtiquetas = (agent: Pick<PrintAgent, 'imprime'>): boolean =>
  papeisDoAgente(agent).includes('etiquetas');

// ---------------------------------------------------------------------------
// Etiqueta desenhada: layout em mm → bitmap no backend → ^GFA. O mesmo desenho
// sai igual na Zebra e na Elgin; a prévia É o bitmap que vai imprimir.
// ---------------------------------------------------------------------------

export type ModeloDesenhavel = 'validade' | 'nutricao-qr' | 'produto' | 'nutricao';
export const MODELOS_DESENHAVEIS: ModeloDesenhavel[] = ['validade', 'nutricao-qr', 'produto', 'nutricao'];

export type TipoDeElemento = 'texto' | 'qr' | 'barras' | 'linha' | 'caixa' | 'tabela' | 'imagem';
export type CampoDaEtiqueta = 'name' | 'manip' | 'val' | 'price' | 'description' | 'barcode' | 'publicUrl' | 'ingredients' | 'allergens';

export interface ElementoDoLayout {
  id: string;
  tipo: TipoDeElemento;
  /** Posição e tamanho em mm, relativos ao canto superior esquerdo da etiqueta. */
  x: number; y: number; w: number; h: number;
  /** texto: molde com {campo}, ex. "Val.: {val}". */
  texto?: string;
  /** texto: altura da letra em mm. */
  tamanho?: number;
  negrito?: boolean;
  /** 0 = quantas linhas couberem na altura da caixa. */
  linhas?: number;
  alinhar?: 'esquerda' | 'centro' | 'direita';
  /** qr / barras: de onde vem o conteúdo. */
  campo?: CampoDaEtiqueta;
  /** caixa: espessura da borda em mm. */
  espessura?: number;
  /** texto: família (Liberation no backend = métricas de Arial / Arial Narrow / Times / Courier). */
  fonte?: 'sans' | 'estreita' | 'serif' | 'mono';
  /** texto: quebrar em `linhas` (padrão) ou manter em uma linha encolhendo a letra até caber. */
  ajuste?: 'quebrar' | 'encolher' | 'caber';
  /** texto: tudo em maiúsculas. */
  maiusculas?: boolean;
  /** texto: rótulo em negrito antes do texto, na mesma linha ("INGREDIENTES:"). */
  prefixo?: string;
  /** texto: branco sobre fundo preto. */
  inverso?: boolean;
  /** texto: giro em graus. */
  rotacao?: 0 | 90 | 180 | 270;
  /** barras: número impresso embaixo. */
  mostrar_numero?: boolean;
  /** imagem: data URL (PNG/JPG em base64, máx. 200 KB). */
  imagem?: string;
  /** tabela: 'laudo' = proporções do PDF do nutricionista (título pequeno, colunas estreitas). */
  estilo?: 'padrao' | 'laudo';
  /** editor: não arrasta nem estica sem destravar. */
  bloqueado?: boolean;
}

export interface LayoutDeEtiqueta {
  versao: 1;
  etiqueta: { largura: number; altura: number };
  papel: {
    largura: number; colunas: number; espaco: number; margem?: number | null;
    /** gap = rolo picotado com vão entre linhas (o normal); continuo = sem vão; auto = não mexe na impressora. */
    modo_midia?: 'gap' | 'continuo' | 'auto';
    /** Só em contínuo: passo entre linhas (altura + vão de linha) em mm. */
    passo?: number | null;
    /** Medidas do rolo. Com as duas margens, a 1ª coluna começa na esquerda e o rolo é a soma. */
    margem_esquerda?: number | null;
    margem_direita?: number | null;
    /** Vão entre uma linha de etiquetas e a próxima. */
    vao_linhas?: number | null;
    /** Modelos com o mesmo rolo compartilham papel e tamanho da etiqueta (o servidor propaga ao salvar). */
    rolo?: string | null;
  };
  elementos: ElementoDoLayout[];
}

export interface LayoutDaLoja { layout: LayoutDeEtiqueta; padrao: boolean }
export type LayoutsDaLoja = Record<ModeloDesenhavel, LayoutDaLoja> & { preferencias?: { validade_dias: number } };

/** Regras da loja que não são desenho: 'validade em N dias'. Ficam no servidor, não no navegador. */
export const salvarPreferenciasDeEtiqueta = (storeUuid: string, preferencias: { validade_dias: number }) =>
  api.put<{ preferencias: { validade_dias: number } }>('/stores/print-jobs/etiquetas/layouts/', { store: storeUuid, preferencias });

/** Deslocamento da IMPRESSORA (mm) e escurecimento — vive no agent, não no layout. */
export interface Calibracao { desloc_x?: number; desloc_y?: number; escuro?: number }

export const carregarLayouts = (storeUuid: string) =>
  api.get<LayoutsDaLoja>('/stores/print-jobs/etiquetas/layouts/', { params: { store: storeUuid } });

/** `layout: null` volta ao padrão. */
export const salvarLayout = (storeUuid: string, modelo: ModeloDesenhavel, layout: LayoutDeEtiqueta | null) =>
  api.put<LayoutDaLoja>('/stores/print-jobs/etiquetas/layouts/', { store: storeUuid, modelo, layout });

export interface PedidoDePreview {
  store: string; modelo: ModeloDesenhavel; layout?: LayoutDeEtiqueta; etiquetas?: unknown[]; grade?: boolean;
}
export const previewDeEtiquetas = (dados: PedidoDePreview) =>
  api.post<{ png: string; largura_mm: number; altura_mm: number }>('/stores/print-jobs/etiquetas/preview/', dados);

export const imprimirGradeDeCalibracao = (dados: { store: string; agent: string; modelo: ModeloDesenhavel; layout?: LayoutDeEtiqueta }) =>
  api.post<{ job: PrintJob }>('/stores/print-jobs/etiquetas/calibracao/', dados);

export const salvarCalibracao = (agentId: string, calibracao: Calibracao) =>
  api.post<{ calibracao: Calibracao }>(`/stores/print-agents/${agentId}/calibracao/`, calibracao);

export const calibracaoDoAgente = (agent: Pick<PrintAgent, 'metadata'>): Calibracao => {
  const meta = (agent.metadata || {}) as { calibracao?: Calibracao };
  return meta.calibracao || {};
};
