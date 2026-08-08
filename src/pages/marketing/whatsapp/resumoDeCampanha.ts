/**
 * O que uma campanha de WhatsApp diz de si mesma na lista.
 *
 * A tela mostrava "1 destinatários • 1 enviadas" e escondia entrega e leitura
 * num modal atrás de um botão só com ícone. Isso inverte a pergunta: ninguém
 * abre a tela para saber quantas mensagens SAÍRAM — abre para saber se a
 * campanha valeu. "Enviadas" é esforço; "lidas" é resultado.
 *
 * TRÊS DECISÕES QUE O CÓDIGO CARREGA:
 *
 * 1. Taxa se calcula sobre o ENVIADO, não sobre o público. Campanha pela
 *    metade dividida pelo total mostraria 45% de entrega numa campanha que
 *    entrega 90% — e alguém pausaria por causa disso.
 *
 * 2. Sem envio, taxa é `null`, nunca `0`. "0% de leitura" acusa uma campanha
 *    ruim; a campanha nem saiu.
 *
 * 3. Amostra minúscula não vira diagnóstico. As duas campanhas reais da Cê
 *    Saladas tinham 1 destinatário — "100% de leitura" sobre uma mensagem é
 *    ruído com cara de dado.
 */
import type { Campaign } from '../../../services/campaigns';

export type TomDeMetrica = 'neutro' | 'bom' | 'perigo';

export interface MetricaDeCampanha {
  rotulo: string;
  valor: string;
  /** Contexto do número. Ex.: "90% do enviado". */
  detalhe?: string;
  tom: TomDeMetrica;
}

export interface ResumoDeCampanha {
  publico: string;
  /** Frase de estado quando não há métrica para mostrar. */
  chamada: string;
  metricas: MetricaDeCampanha[];
  taxaEntrega: number | null;
  taxaLeitura: number | null;
  /** 0–100 enquanto roda; `null` quando a barra não faz sentido. */
  progresso: number | null;
}

/** Abaixo disto, percentual é anedota. */
const AMOSTRA_MINIMA = 10;
/** Entrega saudável no WhatsApp fica acima disto; abaixo, é lista ruim. */
const ENTREGA_ACEITAVEL = 80;
/** Leitura acima disto é campanha que funcionou — vale repetir a fórmula. */
const LEITURA_BOA = 50;

type Metricas = Pick<
  Campaign,
  'status' | 'total_recipients' | 'messages_sent' | 'messages_delivered' | 'messages_read' | 'messages_failed'
>;

const pct = (parte: number, todo: number): number | null =>
  todo > 0 ? Math.round((parte / todo) * 100) : null;

export function resumoDeCampanha(c: Metricas): ResumoDeCampanha {
  const enviadas = c.messages_sent ?? 0;
  const publicoN = c.total_recipients ?? 0;

  const taxaEntrega = pct(c.messages_delivered ?? 0, enviadas);
  const taxaLeitura = pct(c.messages_read ?? 0, enviadas);

  const metricas: MetricaDeCampanha[] = [];
  if (enviadas > 0) {
    metricas.push({ rotulo: 'Enviadas', valor: String(enviadas), tom: 'neutro' });
    metricas.push({
      rotulo: 'Entregues',
      valor: String(c.messages_delivered ?? 0),
      detalhe: taxaEntrega === null ? undefined : `${taxaEntrega}% do enviado`,
      tom: taxaEntrega !== null && taxaEntrega < ENTREGA_ACEITAVEL ? 'perigo' : 'neutro',
    });
    metricas.push({
      rotulo: 'Lidas',
      // `—` e não `0`: a diferença entre "ninguém leu" e "ainda não sabemos"
      // decide se a pessoa reescreve a mensagem ou espera mais um pouco.
      valor: taxaLeitura === null ? '—' : String(c.messages_read ?? 0),
      detalhe: taxaLeitura === null ? undefined : `${taxaLeitura}% do enviado`,
      tom: taxaLeitura !== null && taxaLeitura >= LEITURA_BOA ? 'bom' : 'neutro',
    });
    if ((c.messages_failed ?? 0) > 0) {
      metricas.push({
        rotulo: 'Falhas',
        valor: String(c.messages_failed),
        tom: 'perigo',
      });
    }
  }

  const chamada =
    c.status === 'draft'
      ? 'Rascunho — ainda não foi enviada'
      : c.status === 'scheduled'
        ? 'Agendada — nada enviado ainda'
        : enviadas === 0
          ? 'Sem envios registrados'
          : '';

  return {
    publico: `${publicoN} ${publicoN === 1 ? 'destinatário' : 'destinatários'}`,
    chamada,
    metricas,
    taxaEntrega,
    taxaLeitura,
    // Barra só enquanto roda: numa campanha concluída ela sempre marcaria 100%
    // e viraria enfeite. E travamos em 0–100 porque reenvio de falha faz
    // `messages_sent` passar do total e a barra vazar do card.
    progresso:
      c.status === 'running'
        ? Math.min(100, Math.max(0, pct(enviadas, publicoN) ?? 0))
        : null,
  };
}

export interface InsightDeCampanha {
  chave: 'rascunho' | 'melhor' | 'entrega_baixa';
  direcao: 'alta' | 'baixa' | 'estavel';
  titulo: string;
  valor: string;
  recomendacao: string;
}

export function insightsDeCampanhas(campanhas: Campaign[]): InsightDeCampanha[] {
  if (!campanhas?.length) return [];
  const itens: InsightDeCampanha[] = [];

  // 1. Rascunho com público montado é trabalho pronto que nunca saiu — o
  //    desperdício mais barato de corrigir da tela.
  const rascunhos = campanhas.filter((c) => c.status === 'draft');
  if (rascunhos.length > 0) {
    itens.push({
      chave: 'rascunho',
      direcao: 'estavel',
      titulo: `${rascunhos.length} ${rascunhos.length === 1 ? 'campanha parada em rascunho' : 'campanhas paradas em rascunho'}`,
      valor: rascunhos.map((c) => c.name).slice(0, 3).join(', '),
      recomendacao: 'revise e dispare — rascunho não traz cliente de volta',
    });
  }

  // Só campanhas que de fato saíram, e com gente suficiente para o percentual
  // significar alguma coisa.
  const comAmostra = campanhas.filter(
    (c) => (c.messages_sent ?? 0) >= AMOSTRA_MINIMA
  );

  // 2. Entrega baixa antes de leitura: com a lista errada, o texto não importa.
  const ruim = comAmostra
    .map((c) => ({ c, taxa: resumoDeCampanha(c).taxaEntrega ?? 100 }))
    .filter((x) => x.taxa < ENTREGA_ACEITAVEL)
    .sort((a, b) => a.taxa - b.taxa)[0];
  if (ruim) {
    itens.push({
      chave: 'entrega_baixa',
      direcao: 'baixa',
      titulo: `Entrega baixa em "${ruim.c.name}"`,
      valor: `${ruim.taxa}% das mensagens chegaram`,
      recomendacao: 'confira os números da lista e a janela de 24h — não é o texto',
    });
  }

  // 3. O que funcionou, para repetir a fórmula — não para admirar.
  const melhor = comAmostra
    .map((c) => ({ c, taxa: resumoDeCampanha(c).taxaLeitura ?? 0 }))
    .filter((x) => x.taxa >= LEITURA_BOA)
    .sort((a, b) => b.taxa - a.taxa)[0];
  if (melhor) {
    itens.push({
      chave: 'melhor',
      direcao: 'alta',
      titulo: `"${melhor.c.name}" foi a mais lida`,
      valor: `${melhor.taxa}% de leitura`,
      recomendacao: 'repita o mesmo tom e horário na próxima campanha',
    });
  }

  return itens;
}

export default resumoDeCampanha;
