/**
 * Diagnóstico da página de cupons.
 *
 * A tela mostrava quatro números e uma tabela. Números não dizem o que fazer:
 * "21 cupons ativos" pode ser uma operação saudável ou vinte cupons esquecidos
 * que ninguém usa. O que muda a semana do dono é a frase — "4 expiram em 7
 * dias, priorize a extensão" — e ela se calcula do que já está na tela.
 *
 * TRÊS REGRAS QUE MOLDAM ESTE ARQUIVO:
 *
 * 1. Todo diagnóstico termina em AÇÃO. Se não dá para dizer o que fazer,
 *    o item não vira insight: vira número, e número a tabela já mostra.
 *
 * 2. Só o acionável agora. "Cupom expirou mês passado" é história, não
 *    alerta — e alerta que não pede nada ensina a ignorar a seção inteira.
 *
 * 3. Nada de inventar sinal onde não há. Loja com dois cupons não precisa de
 *    quatro diagnósticos; a lista vazia é uma resposta válida.
 *
 * Calculado no frontend de propósito: a lista de cupons já está carregada, e
 * uma ida ao servidor para reprocessar o que está na memória adiciona latência
 * e um segundo lugar onde a regra pode divergir.
 */
import type { Coupon } from '../../services/coupons';

export type DirecaoDeInsight = 'alta' | 'baixa' | 'estavel';

export interface InsightDeCupom {
  chave: string;
  direcao: DirecaoDeInsight;
  titulo: string;
  valor: string;
  recomendacao: string;
}

/** Janela do "expira em breve". Uma semana é o horizonte de quem opera. */
const DIAS_PARA_EXPIRAR = 7;

/** Abaixo disto "sem uso" é amostra pequena, não diagnóstico. */
const DIAS_MINIMOS_NO_AR = 14;

function diasAte(iso?: string | null): number | null {
  if (!iso) return null;
  const alvo = new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
  if (Number.isNaN(alvo)) return null;
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return Math.round((alvo - hoje.getTime()) / 86_400_000);
}

export function insightsDeCupons(cupons: Coupon[] | null | undefined): InsightDeCupom[] {
  if (!cupons?.length) return [];

  const ativos = cupons.filter((c) => c.is_active);
  const insights: InsightDeCupom[] = [];

  // 1. Expirando — o único com prazo, então vem primeiro.
  const expirando = ativos.filter((c) => {
    const d = diasAte(c.valid_until);
    // `d >= 0`: já expirado é história, não alerta. Alerta que não pede nada
    // ensina o operador a ignorar a seção inteira.
    return d !== null && d >= 0 && d <= DIAS_PARA_EXPIRAR;
  });
  if (expirando.length > 0) {
    const nomes = expirando.slice(0, 3).map((c) => c.code).join(', ');
    insights.push({
      chave: 'expirando',
      direcao: 'baixa',
      titulo: `${expirando.length} cupom${expirando.length > 1 ? 's' : ''} expirando em até ${DIAS_PARA_EXPIRAR} dias`,
      valor: nomes + (expirando.length > 3 ? '…' : ''),
      recomendacao: 'estenda a validade ou republique antes de perder a campanha',
    });
  }

  // 2. O que está funcionando — para repetir, não só para admirar.
  const usados = ativos.filter((c) => c.used_count > 0);
  if (usados.length > 0) {
    const campeao = usados.reduce((a, b) => (b.used_count > a.used_count ? b : a));
    insights.push({
      chave: 'campeao',
      direcao: 'alta',
      titulo: `Cupom mais usado: ${campeao.code}`,
      valor: `${campeao.used_count} uso${campeao.used_count > 1 ? 's' : ''}`,
      recomendacao: 'duplique a campanha com novo período e código',
    });
  }

  // 3. Dinheiro parado: ativo, no ar há tempo, e ninguém usou.
  const parados = ativos.filter((c) => {
    if (c.used_count > 0) return false;
    const noAr = diasAte(c.valid_from);
    // `noAr` é negativo para quem já começou; -14 significa 14 dias no ar.
    return noAr !== null && noAr <= -DIAS_MINIMOS_NO_AR;
  });
  if (parados.length > 0) {
    insights.push({
      chave: 'sem_uso',
      direcao: 'baixa',
      titulo: `${parados.length} cupom${parados.length > 1 ? 's' : ''} ativo${parados.length > 1 ? 's' : ''} sem nenhum uso`,
      valor: `há mais de ${DIAS_MINIMOS_NO_AR} dias`,
      recomendacao: 'divulgue no WhatsApp ou desative para limpar a lista',
    });
  }

  // 4. Limite quase estourado — o cupom morre sozinho e ninguém percebe.
  const noLimite = ativos.filter(
    (c) => c.usage_limit != null && c.usage_limit > 0 && c.used_count / c.usage_limit >= 0.8
  );
  if (noLimite.length > 0) {
    const c = noLimite[0];
    insights.push({
      chave: 'limite',
      direcao: 'alta',
      titulo: `${c.code} está perto do limite de usos`,
      valor: `${c.used_count} de ${c.usage_limit}`,
      recomendacao: 'aumente o limite se a campanha ainda deve rodar',
    });
  }

  return insights;
}

export default insightsDeCupons;
