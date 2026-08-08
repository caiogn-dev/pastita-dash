/**
 * Diagnóstico da base de clientes.
 *
 * "2.386 clientes cadastrados" não muda o dia de ninguém. "12 clientes em
 * risco — 30 a 45 dias sem comprar · mande um cupom antes que virem inativos"
 * muda: dá para disparar hoje à tarde.
 *
 * DUAS REGRAS QUE MOLDAM ESTE ARQUIVO:
 *
 * 1. A RÉGUA VAI JUNTO. "Em risco" sem o corte é opinião nossa disfarçada de
 *    dado — quem lê não tem como julgar se concorda, nem como explicar o
 *    número para outra pessoa. O corte vem do backend (`reguas`), então mudar
 *    a régua lá muda o texto aqui sozinho.
 *
 * 2. Cada segmento pede uma AÇÃO DIFERENTE. Somar "inativos" com "nunca
 *    comprou" num alerta só produziria a mesma campanha para os dois — e
 *    "sentimos sua falta" para quem nunca pediu queima o contato e expõe que a
 *    loja não sabe com quem está falando.
 *
 * Calculado no frontend porque os segmentos já vêm no `stats`. Uma segunda ida
 * ao servidor só para reordenar o que está na memória adiciona latência e um
 * lugar a mais onde a régua pode divergir da tela.
 */
// O tipo mora no serviço, junto do contrato da API — importar de lá evita
// duas definições que divergem no primeiro campo novo.
import type { SegmentosDeClientes } from '../../services/storesApi';

export type { SegmentosDeClientes };

export interface InsightDeClientes {
  chave: 'em_risco' | 'inativos' | 'sem_compra' | 'saudavel';
  direcao: 'alta' | 'baixa' | 'estavel';
  titulo: string;
  valor: string;
  recomendacao: string;
}

const plural = (n: number, um: string, muitos: string) => (n === 1 ? um : muitos);

export function insightsDeClientes(
  seg: SegmentosDeClientes | null | undefined
): InsightDeClientes[] {
  if (!seg) return [];

  const itens: InsightDeClientes[] = [];
  const r = seg.reguas;

  // 1. Em risco primeiro: é o ÚNICO com janela de recuperação. Quem sumiu há
  //    três meses volta com campanha; quem está no meio do caminho ainda
  //    responde a um "sentimos sua falta".
  if (seg.em_risco > 0) {
    itens.push({
      chave: 'em_risco',
      direcao: 'baixa',
      titulo: `${seg.em_risco} ${plural(seg.em_risco, 'cliente em risco', 'clientes em risco')}`,
      valor: r.em_risco,
      recomendacao: 'mande um cupom agora — depois de 45 dias a taxa de volta despenca',
    });
  }

  // 2. Inativos: volume grande, resposta baixa. Vale campanha, não lembrete.
  if (seg.inativos > 0) {
    itens.push({
      chave: 'inativos',
      direcao: 'baixa',
      titulo: `${seg.inativos} ${plural(seg.inativos, 'cliente inativo', 'clientes inativos')}`,
      valor: r.inativos,
      recomendacao: 'campanha de reativação com oferta forte, não mensagem avulsa',
    });
  }

  // 3. Cadastro sem compra é LEAD, não cliente perdido. A ação é converter a
  //    primeira compra — nunca "sentimos sua falta".
  if (seg.sem_compra > 0) {
    itens.push({
      chave: 'sem_compra',
      direcao: 'estavel',
      titulo: `${seg.sem_compra} ${plural(seg.sem_compra, 'cadastro', 'cadastros')} sem nenhuma compra`,
      valor: r.sem_compra,
      recomendacao: 'cupom de boas-vindas para destravar a primeira compra',
    });
  }

  // 4. Base saudável. Zero alertas com 200 clientes ativos lê como "a seção
  //    quebrou" — dizer que está bem também é informação.
  if (itens.length === 0 && seg.ativos > 0) {
    itens.push({
      chave: 'saudavel',
      direcao: 'alta',
      titulo: 'Base saudável — ninguém em risco de sumir',
      valor: `${seg.ativos} ${plural(seg.ativos, 'cliente ativo', 'clientes ativos')} · ${r.ativos}`,
      recomendacao: 'bom momento para subir o ticket com combos, não para descontos',
    });
  }

  return itens;
}

export default insightsDeClientes;
