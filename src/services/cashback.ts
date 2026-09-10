import api from './api';
import type { IndicacaoRow, IndicadorAgregado } from '../pages/loyalty/indicacoes';

/** Agregado do banco inteiro — nunca somar as linhas da página para obter isto. */
export interface CashbackResumo {
  /** Promessa: saldo vivo que a loja ainda vai pagar. */
  saldo_em_circulacao: string;
  /** Conta paga: crédito que já virou desconto. */
  ja_resgatado: string;
  clientes_com_saldo: number;
  saldo_de_indicacao: string;
  /** O único número com prazo — e por isso o único que manda agir hoje. */
  vence_em_7_dias: string;
  /**
   * Saldo que o cliente JÁ PAGOU (pacotes da carteira). Não é custo: esse
   * dinheiro entrou no caixa. Somar com o concedido produz um "quanto eu devo"
   * inflado, que é o erro que esta separação existe para evitar.
   */
  saldo_pago_pelo_cliente: string;
  /** Cashback e brindes: isto sim é custo de marketing ainda não pago. */
  saldo_concedido_pela_loja: string;
  por_origem: Record<string, string>;
}

export interface CashbackClienteRow {
  phone: string;
  /** Nome do pedido mais recente. Vazio para quem tem saldo e nunca comprou. */
  nome: string;
  saldo: string;
  /** Parte comprada do saldo — a única que exige telefone comprovado para gastar. */
  saldo_carteira: string;
  cupons_entrega: number;
  vence_em: string;
  dias_para_vencer: number;
}

/** Uma linha do extrato: o que entrou ou saiu, e de onde veio. */
export interface LancamentoDeCashback {
  tipo: 'entrada' | 'saida';
  quando: string;
  /** `purchase` | `referral` | `adjust` | `prepaid` | `redemption`. */
  origem: string;
  /** Já em português, pronto para exibir — vem do backend. */
  rotulo: string;
  valor: string;
  /** Quanto sobrou DESTE lote. `null` nas saídas. */
  restante: string | null;
  /** Na indicação, é aqui que mora a resposta: de quem foi o pedido. */
  pedido: { id: string; numero: string; cliente: string; total: string } | null;
  /** Motivo do crédito manual, quando não há pedido. */
  referencia: string;
  vence_em: string | null;
  vencido: boolean;
}

export interface AjusteDeSaldo {
  phone: string;
  valor: string;
  motivo: string;
}

export interface CashbackResponse {
  enabled: boolean;
  percent: string;
  referral_percent: string;
  expiry_days: number;
  resumo: CashbackResumo;
  count: number;
  results: CashbackClienteRow[];
}

export interface IndicacoesResponse {
  indicacoes: IndicacaoRow[];
  por_indicador: IndicadorAgregado[];
  referral_percent: string;
}

class CashbackService {
  /**
   * Quem veio por quem.
   *
   * Separado do resumo de cashback de propósito: o resumo responde "quanto o
   * programa me custa" e carrega em toda abertura da tela. Isto responde "a
   * quem eu agradeço", e só interessa quando o dono abre a aba.
   */
  async indicacoes(storeSlug: string): Promise<IndicacoesResponse> {
    const { data } = await api.get(`/stores/${storeSlug}/indicacoes/`);
    return data;
  }

  async get(storeSlug: string, page = 1): Promise<CashbackResponse> {
    const { data } = await api.get(`/stores/${storeSlug}/cashback/`, { params: { page } });
    return data;
  }

  /**
   * O saldo de UMA pessoa — o mesmo endpoint, com recorte.
   *
   * Não usa o endpoint público de saldo: ele esconde a parte comprada de quem
   * não comprovou o número, que é a regra certa para a cliente e errada para
   * o dono, que precisa ver o que ela tem.
   */
  async saldoDoCliente(storeSlug: string, phone: string): Promise<CashbackClienteRow | null> {
    const { data } = await api.get(`/stores/${storeSlug}/cashback/`, { params: { phone } });
    return (data?.results ?? [])[0] ?? null;
  }

  /**
   * De onde veio cada real do cliente.
   *
   * Separado do saldo de propósito: o saldo é um número que toda ficha lê, o
   * extrato é uma lista que só interessa quando alguém pergunta "de onde veio
   * isso?". Carregar os dois juntos faria toda abertura de ficha pagar por
   * uma pergunta que quase nunca é feita.
   */
  async extrato(storeSlug: string, phone: string): Promise<LancamentoDeCashback[]> {
    const { data } = await api.get(`/stores/${storeSlug}/cashback/extrato/`, { params: { phone } });
    return data?.lancamentos ?? [];
  }

  /**
   * Crédito manual: cortesia, reparação, brinde.
   *
   * `motivo` é obrigatório no backend de propósito — crédito sem justificativa
   * é o buraco por onde some dinheiro em qualquer programa de fidelidade.
   */
  async ajustar(storeSlug: string, ajuste: AjusteDeSaldo) {
    const { data } = await api.post(`/stores/${storeSlug}/cashback/ajustar/`, ajuste);
    return data;
  }
}

export const cashbackService = new CashbackService();
