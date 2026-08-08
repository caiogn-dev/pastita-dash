/**
 * Conquistas e metas de faturamento.
 *
 * Os marcos são DERIVADOS no backend a partir do histórico de pedidos, nunca
 * gravados: pedido cancelado depois de pago desfaz a conquista sozinho. Aqui
 * só há leitura.
 */
import api from './api';

export interface Conquista {
  chave: string;
  titulo: string;
  descricao: string;
  /** `null` na "primeira venda" — é a única conquista que não é sobre dinheiro. */
  valor: string | null;
  alcancado_em: string;
  faturamento_no_marco: string;
}

export interface ProximaConquista {
  chave: string;
  titulo: string;
  descricao: string;
  valor: string | null;
  acumulado: string;
  falta: string | null;
  progresso_pct: number;
  /** `null` quando a loja está parada: data chutada é pior que nenhuma. */
  dias_estimados: number | null;
  prazo_estimado: string | null;
}

export interface MetaAnual {
  ano: number;
  /** `null` sem ano anterior — não há base para uma meta honesta. */
  alvo: string | null;
  realizado: string;
  base: string;
  crescimento_pct: number;
  progresso_pct: number | null;
  falta: string | null;
}

export interface ResumoDeMetas {
  mes_atual: string;
  mes_anterior: string;
  /** `null` quando o período anterior foi zero: sair de zero não é "+100%". */
  crescimento_mensal_pct: number | null;
  ano_atual: string;
  ano_anterior: string;
  crescimento_anual_pct: number | null;
  meta_anual: MetaAnual;
}

export interface PainelDeConquistas {
  resumo: ResumoDeMetas;
  /** `null` quando todos os marcos da escala já foram batidos. */
  proxima: ProximaConquista | null;
  conquistas: Conquista[];
}

export async function getConquistas(storeSlug: string): Promise<PainelDeConquistas> {
  const { data } = await api.get<PainelDeConquistas>(`/stores/${storeSlug}/conquistas/`);
  return data;
}
