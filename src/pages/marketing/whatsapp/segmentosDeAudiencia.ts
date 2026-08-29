/**
 * Como o painel monta e explica a audiência de uma campanha.
 *
 * A tela antiga mandava `source: 'all'` fixo no código: a única audiência
 * possível era "todos". Campanha para todo mundo é a que mais queima base —
 * quem comprou ontem recebe "sentimos sua falta", quem nunca comprou recebe
 * "peça o seu de sempre" — e cada disparo errado empurra a pessoa para o botão
 * "Parar promoções".
 *
 * Isto aqui é REGRA, não layout, e por isso mora fora do `.tsx`: qual
 * combinação faz sentido, o que é atalho e o que a tela promete ao dono são
 * decisões de produto que precisam de teste.
 */
import type { FiltrosDeAudiencia, Frequencia, Recencia } from '../../../services/campaigns';

/**
 * Atalhos que resolvem a campanha de verdade que o dono quer fazer.
 *
 * Existem porque escolher quatro eixos soltos é trabalho de analista, e quem
 * usa o painel está entre um pedido e outro. Cada atalho tem um NOME que diz a
 * intenção comercial, não o filtro técnico por trás.
 */
export interface AtalhoDeAudiencia {
  chave: string;
  nome: string;
  /** Por que disparar para este grupo — some da tela se não convencer. */
  porque: string;
  filtros: FiltrosDeAudiencia;
}

export const ATALHOS: AtalhoDeAudiencia[] = [
  {
    chave: 'sumidos',
    nome: 'Trazer de volta quem sumiu',
    porque: 'já compraram e pararam — é a lista mais barata de reativar',
    filtros: { recencia: ['inativo'] },
  },
  {
    chave: 'quase_sumindo',
    nome: 'Segurar quem está sumindo',
    porque: 'entre 30 e 45 dias sem comprar: ainda lembram da loja',
    filtros: { recencia: ['em_risco'] },
  },
  {
    chave: 'vips',
    nome: 'Recompensar os VIPs',
    porque: '5 pedidos ou mais — quem mais gasta merece a oferta primeiro',
    filtros: { frequencia: ['vip'] },
  },
  {
    chave: 'segunda_compra',
    nome: 'Buscar a segunda compra',
    porque: 'comprou uma vez só: a segunda compra é a que cria o hábito',
    filtros: { frequencia: ['novo'] },
  },
  {
    chave: 'nunca_compraram',
    nome: 'Converter quem só conversou',
    porque: 'falaram com a loja e nunca pediram — pedem cupom de primeira compra',
    filtros: { recencia: ['nunca_comprou'] },
  },
];

/** Combinações que devolvem lista vazia por construção, não por falta de dado. */
export function conflitoNosFiltros(f: FiltrosDeAudiencia): string | null {
  const recencia = f.recencia ?? [];
  const frequencia = f.frequencia ?? [];

  // Quem nunca comprou não tem pedido, então não pode ter perfil de compra
  // nem ticket. Deixar passar devolveria zero e pareceria bug do sistema.
  const soNuncaComprou = recencia.length === 1 && recencia[0] === 'nunca_comprou';
  if (soNuncaComprou && frequencia.length) {
    return 'Quem nunca comprou não tem número de pedidos — escolha um ou outro.';
  }
  if (soNuncaComprou && (f.ticket_min != null || f.ticket_max != null)) {
    return 'Quem nunca comprou não tem ticket médio — remova a faixa de valor.';
  }
  if (soNuncaComprou && f.produtos?.length) {
    return 'Quem nunca comprou não pediu nenhum produto — remova o filtro de produto.';
  }
  if (
    f.ticket_min != null && f.ticket_max != null &&
    f.ticket_min > f.ticket_max
  ) {
    return 'O valor mínimo está acima do máximo.';
  }
  return null;
}

export function filtrosVazios(f: FiltrosDeAudiencia): boolean {
  return (
    !f.recencia?.length &&
    !f.frequencia?.length &&
    !f.produtos?.length &&
    !f.bairros?.length &&
    f.ticket_min == null &&
    f.ticket_max == null
  );
}

/** Qual atalho corresponde exatamente aos filtros atuais, se algum. */
export function atalhoAtivo(f: FiltrosDeAudiencia): string | null {
  const igual = (a?: string[], b?: string[]) =>
    (a ?? []).length === (b ?? []).length &&
    (a ?? []).every((v) => (b ?? []).includes(v));

  const achado = ATALHOS.find(
    (atalho) =>
      igual(atalho.filtros.recencia, f.recencia) &&
      igual(atalho.filtros.frequencia, f.frequencia) &&
      !f.produtos?.length && !f.bairros?.length &&
      f.ticket_min == null && f.ticket_max == null,
  );
  return achado?.chave ?? null;
}

export type TomDeAudiencia = 'vazio' | 'pequena' | 'ok';

/**
 * O aviso que a tela dá ANTES do disparo.
 *
 * Uma campanha para 3 pessoas não é campanha, e uma lista vazia depois de
 * escolher filtro parece bug — nos dois casos o dono precisa saber antes de
 * montar a mensagem inteira, não depois.
 */
export function avisoDaAudiencia(
  total: number,
  excluidosPorOptOut: number,
): { tom: TomDeAudiencia; texto: string } | null {
  if (total === 0) {
    return {
      tom: 'vazio',
      texto: 'Nenhum contato neste segmento. Afrouxe os filtros para alcançar mais gente.',
    };
  }
  if (total < 10) {
    // O mesmo corte de amostra que o resumo usa para não virar percentual de
    // anedota: abaixo disso, taxa de leitura não diz nada.
    return {
      tom: 'pequena',
      texto: `Só ${total} ${total === 1 ? 'pessoa' : 'pessoas'} — o resultado não vai dizer se a mensagem funcionou.`,
    };
  }
  if (excluidosPorOptOut > 0) {
    return {
      tom: 'ok',
      texto: `${excluidosPorOptOut} ${
        excluidosPorOptOut === 1 ? 'pessoa foi excluída' : 'pessoas foram excluídas'
      } por terem pedido para parar de receber.`,
    };
  }
  return null;
}

export const ROTULO_RECENCIA: Record<Recencia, string> = {
  ativo: 'Comprou nos últimos 30 dias',
  em_risco: '30 a 45 dias sem comprar',
  inativo: 'Mais de 45 dias sem comprar',
  nunca_comprou: 'Nunca comprou',
};

export const ROTULO_FREQUENCIA: Record<Frequencia, string> = {
  novo: 'Novo (1 pedido)',
  ocasional: 'Ocasional (2 a 4)',
  vip: 'VIP (5 ou mais)',
};
