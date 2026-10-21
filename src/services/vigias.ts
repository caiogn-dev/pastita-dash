/**
 * Vigias — avisos curtos ao dono no WhatsApp (resumo da manhã, sabor em queda,
 * cliente que sumiu, nenhum pedido até o almoço). A regra decide no backend
 * (`server2/apps/stores/vigias/`); aqui só se liga, ajusta e acompanha.
 */
import api from './api';

export type TipoDeVigia =
  | 'resumo' | 'sem_pedido' | 'sabor_em_queda' | 'fiel_sumiu' | 'margem_baixa' | 'sem_custo';

export interface ConfigDosVigias {
  ativo: boolean;
  pausado: boolean;
  pausado_em: string | null;
  telefone: string;
  /** Cópia do resumo por e-mail, com todos os avisos (do Prefiro). '' = desligado. */
  email?: string;
  hora_resumo: string;
  hora_alerta: string;
  /** 0 = segunda … 6 = domingo. */
  dias: number[];
  desligados: TipoDeVigia[];
}

export interface VigiaDoCatalogo {
  tipo: TipoDeVigia;
  nome: string;
  icone: string;
  quando: string;
  exemplo: string;
}

export type EstadoDoModelo = 'aprovado' | 'pendente' | 'recusado' | 'ausente' | 'sem_whatsapp';

export interface EnvioDeVigia {
  id: string;
  dia: string;
  turno: 'manha' | 'alerta';
  status: 'enviado' | 'so_painel' | 'falhou' | 'silencio';
  canal: 'texto' | 'modelo' | 'painel';
  erro: string;
  criado_em: string;
}

export interface PainelDosVigias {
  config: ConfigDosVigias;
  catalogo: VigiaDoCatalogo[];
  canal: { whatsapp_conectado: boolean; modelo: EstadoDoModelo; conversa_aberta: boolean };
  ultimo_envio: EnvioDeVigia | null;
}

export interface AvisoDeVigia {
  id: string;
  tipo: TipoDeVigia;
  titulo: string;
  texto: string;
  prioridade: number;
  dados: Record<string, unknown>;
  util: boolean | null;
  criado_em: string;
  envio: EnvioDeVigia | null;
}

export interface FatoDaPrevia {
  tipo: TipoDeVigia;
  titulo: string;
  texto: string;
  prioridade: number;
}

export interface PreviaDosVigias {
  fatos: FatoDaPrevia[];
  mensagem: string;
  dia: string;
}

export interface ResultadoDoTeste {
  status: 'enviado' | 'so_painel' | 'falhou';
  canal: string;
  erro: string;
}

export const vigiasService = {
  async painel(store: string): Promise<PainelDosVigias> {
    const { data } = await api.get<PainelDosVigias>('/stores/vigias/', { params: { store } });
    return data;
  },
  async salvar(store: string, mudancas: Partial<ConfigDosVigias>): Promise<PainelDosVigias> {
    const { data } = await api.patch<PainelDosVigias>('/stores/vigias/', mudancas, { params: { store } });
    return data;
  },
  async avisos(store: string, limite = 30): Promise<AvisoDeVigia[]> {
    const { data } = await api.get<{ resultados: AvisoDeVigia[] }>('/stores/vigias/avisos/', { params: { store, limite } });
    return data.resultados;
  },
  async marcarUtil(store: string, id: string, util: boolean | null): Promise<AvisoDeVigia> {
    const { data } = await api.post<AvisoDeVigia>(`/stores/vigias/avisos/${id}/util/`, { util }, { params: { store } });
    return data;
  },
  async previa(store: string): Promise<PreviaDosVigias> {
    const { data } = await api.get<PreviaDosVigias>('/stores/vigias/previa/', { params: { store } });
    return data;
  },
  /** Manda a prévia ao telefone do dono agora. 409 = não chegou (o corpo diz o motivo). */
  async testar(store: string): Promise<ResultadoDoTeste> {
    try {
      const { data } = await api.post<ResultadoDoTeste>('/stores/vigias/teste/', {}, { params: { store } });
      return data;
    } catch (erro: unknown) {
      const resposta = (erro as { response?: { status?: number; data?: Partial<ResultadoDoTeste> & { error?: string } } }).response;
      if (resposta?.status === 409 && resposta.data?.status) return resposta.data as ResultadoDoTeste;
      throw erro;
    }
  },
  async pedirModelo(store: string): Promise<{ modelo: EstadoDoModelo }> {
    const { data } = await api.post<{ modelo: EstadoDoModelo }>('/stores/vigias/modelo/', {}, { params: { store } });
    return data;
  },
};

/** Telefone só com dígitos → "(63) 99911-2233". Mantém o que não reconhece. */
export function formatarTelefone(digitos: string): string {
  const d = (digitos || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digitos || '';
}

/** Para o lojista: por onde o aviso chega e, se não chega, o que fazer. */
export function explicarCanal(canal: PainelDosVigias['canal'], telefone: string): {
  tom: 'success' | 'warning' | 'danger' | 'neutral';
  texto: string;
  acao?: 'pedir_modelo' | 'conectar' | 'telefone';
} {
  if (!canal.whatsapp_conectado) return { tom: 'danger', texto: 'WhatsApp da loja não conectado', acao: 'conectar' };
  if (!telefone) return { tom: 'warning', texto: 'Falta o celular que recebe', acao: 'telefone' };
  if (canal.modelo === 'aprovado') return { tom: 'success', texto: 'Chega todo dia no WhatsApp' };
  if (canal.modelo === 'pendente') return { tom: 'warning', texto: 'Mensagem em aprovação na Meta' };
  if (canal.modelo === 'recusado') return { tom: 'danger', texto: 'A Meta recusou a mensagem', acao: 'pedir_modelo' };
  if (canal.conversa_aberta) return { tom: 'warning', texto: 'Chega só se você falou com a loja nas últimas 24 h', acao: 'pedir_modelo' };
  return { tom: 'warning', texto: 'Por enquanto, só aqui no painel', acao: 'pedir_modelo' };
}

export function explicarEnvio(envio: EnvioDeVigia | null): { tom: 'success' | 'warning' | 'danger' | 'neutral'; texto: string } {
  if (!envio) return { tom: 'neutral', texto: 'Só no painel' };
  if (envio.status === 'enviado') return { tom: 'success', texto: 'Enviado no WhatsApp' };
  if (envio.status === 'falhou') return { tom: 'danger', texto: 'Não chegou no WhatsApp' };
  return { tom: 'neutral', texto: 'Só no painel' };
}
