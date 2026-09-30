/**
 * Notas fiscais da loja — `/stores/{slug}/fiscal/`.
 *
 * O destinatário da nota é um cadastro próprio, não o endereço de entrega do
 * pedido: pedido de retirada para empresa não tem endereço completo, e a NF-e
 * não sai sem número e bairro.
 */
import api from './api';

export type ModeloDeNota = '65' | '55';

export interface EnderecoFiscal {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface DestinatarioDaNota {
  documento: string;
  nome: string;
  inscricao_estadual: string;
  /** Para onde a nota vai depois de autorizada. */
  email?: string;
  endereco: EnderecoFiscal;
}

export interface DestinatarioSalvo extends DestinatarioDaNota {
  id: string;
  telefone?: string;
  customer_id?: string | null;
}

export interface NotaDaLoja {
  id: string;
  status: 'pending' | 'authorized' | 'rejected' | 'cancelled' | 'error';
  modelo: ModeloDeNota;
  ambiente: 'homologacao' | 'producao';
  numero: string;
  serie: string;
  chave_acesso: string;
  danfe_url: string;
  xml_url: string;
  error_message: string;
  created_at: string;
  /** Último envio por e-mail; vazio = ainda não foi. */
  email_enviado_para?: string;
  email_enviado_em?: string | null;
  /** E-mail do cadastro do destinatário, para o envio não começar em branco. */
  email_sugerido?: string;
  /** Só na resposta da emissão: a nota saiu, o e-mail não. */
  email_erro?: string;
  pedido: { id: string; order_number: string; customer_name: string; total: string | number };
  destinatario: { documento: string; nome: string } | null;
}

export interface ResumoDeNotas {
  autorizadas_no_mes: number;
  valor_no_mes: string | number;
  nao_sairam: number;
  processando: number;
}

export interface NotasDaLoja {
  /** Loja com emissão configurada e ligada. */
  habilitado: boolean;
  ambiente: 'homologacao' | 'producao';
  resumo: ResumoDeNotas;
  notas: NotaDaLoja[];
}

export interface PedidoParaNota {
  id: string;
  order_number: string;
  customer_name: string;
  total: string | number;
  created_at: string;
  delivery_method: string;
  /** A última tentativa de cada modelo. */
  notas: { modelo: ModeloDeNota; status: NotaDaLoja['status'] }[];
  /** O que o pedido já sabe do destinatário — vira preenchimento do formulário. */
  sugestao: DestinatarioDaNota;
}

export interface FiltroDeNotas {
  status?: string;
  modelo?: string;
  q?: string;
}

export interface PedidoDeEmissao {
  order_id: string;
  modelo: ModeloDeNota;
  destinatario?: DestinatarioDaNota;
  /** Autorizada, já manda ao e-mail do destinatário. */
  enviar_email?: boolean;
}

const base = (loja: string) => `/stores/${loja}/fiscal`;

const semVazios = (filtro: object) =>
  Object.fromEntries(Object.entries(filtro).filter(([, v]) => v !== undefined && v !== ''));

export const fiscalService = {
  listarNotas: async (loja: string, filtro: FiltroDeNotas = {}): Promise<NotasDaLoja> =>
    (await api.get<NotasDaLoja>(`${base(loja)}/notas/`, { params: semVazios(filtro) })).data,

  listarPedidos: async (loja: string, filtro: { q?: string; id?: string } = {}): Promise<PedidoParaNota[]> =>
    (await api.get<PedidoParaNota[]>(`${base(loja)}/pedidos/`, { params: semVazios(filtro) })).data,

  listarDestinatarios: async (loja: string, q?: string): Promise<DestinatarioSalvo[]> =>
    (await api.get<DestinatarioSalvo[]>(`${base(loja)}/destinatarios/`, { params: semVazios({ q }) })).data,

  consultarCnpj: async (loja: string, cnpj: string): Promise<DestinatarioDaNota> =>
    (await api.get<DestinatarioDaNota>(`${base(loja)}/cnpj/${cnpj}/`)).data,

  /** A SEFAZ pode levar mais que o tempo padrão das chamadas do painel. */
  emitir: async (loja: string, pedido: PedidoDeEmissao): Promise<NotaDaLoja> =>
    (await api.post<NotaDaLoja>(`${base(loja)}/notas/emitir/`, pedido, { timeout: 60_000 })).data,

  /** E-mail em branco = usa o do cadastro do destinatário. */
  enviarEmail: async (loja: string, id: string, email: string): Promise<NotaDaLoja> =>
    (await api.post<NotaDaLoja>(`${base(loja)}/notas/${id}/enviar-email/`, { email }, { timeout: 60_000 })).data,

  cancelar: async (loja: string, id: string, justificativa: string): Promise<NotaDaLoja> =>
    (await api.post<NotaDaLoja>(`${base(loja)}/notas/${id}/cancelar/`, { justificativa })).data,
};

export default fiscalService;
