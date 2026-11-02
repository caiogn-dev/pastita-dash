/**
 * Os avisos automáticos agrupados pelo momento da compra (26/10).
 *
 * Até aqui a tela empilhava 31 seções, uma por evento, todas abertas mesmo
 * vazias. Agora são três grupos (Conversa, Pedido, Pagamento) e só aparece o
 * evento que tem texto; o resto mora atrás de "Adicionar aviso".
 *
 * Ficam de fora:
 * - `faq`: brigava com Ensinar o bot, que é onde o dono ensina resposta;
 * - `cart_*`: os lembretes de carrinho moram no Recuperador de vendas, ao lado
 *   do número que eles tentam recuperar.
 */
import type { AutoMessageEventType } from '../../types';
import { semAcento } from '../../utils/texto';

export interface GrupoDeAvisos {
  id: 'conversa' | 'pedido' | 'pagamento' | 'carrinho';
  titulo: string;
  eventos: AutoMessageEventType[];
}

export const GRUPOS_DO_ATENDIMENTO: GrupoDeAvisos[] = [
  {
    id: 'conversa',
    titulo: 'Conversa',
    eventos: ['welcome', 'menu', 'business_hours', 'out_of_hours', 'human_handoff', 'human_assigned', 'custom'],
  },
  {
    id: 'pedido',
    titulo: 'Pedido',
    eventos: [
      'order_received', 'order_confirmed', 'order_preparing', 'order_ready', 'order_shipped',
      'order_out_for_delivery', 'order_delivered', 'order_cancelled',
      'feedback_request', 'feedback_received',
    ],
  },
  {
    id: 'pagamento',
    titulo: 'Pagamento',
    eventos: [
      'pix_generated', 'pix_reminder', 'pix_expired',
      'payment_reminder_1', 'payment_reminder_2', 'payment_confirmed', 'payment_failed',
    ],
  },
];

export const GRUPO_DO_CARRINHO: GrupoDeAvisos = {
  id: 'carrinho',
  titulo: 'Lembretes de carrinho',
  eventos: ['cart_created', 'cart_abandoned', 'cart_reminder', 'cart_reminder_30', 'cart_reminder_2h', 'cart_reminder_24h'],
};

/** Âncora da seção de lembretes no Recuperador — o "Editar texto" do carrinho cai aqui. */
export const ANCORA_DO_CARRINHO = 'lembretes-de-carrinho';

// Uma casa e vírgula ("1,5 h"). Sem toLocaleString com casas decimais: a spec
// dinheiroUnico trata esse padrão como formatador de moeda paralelo (26/10).
const numero = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/** "Espera 30 min" em vez de "Espera 1800s": ninguém pensa em segundos. */
export function esperaEmTexto(segundos?: number | null): string {
  if (!segundos || segundos <= 0) return '';
  const minutos = segundos / 60;
  if (minutos >= 60 && minutos % 60 === 0) return `Espera ${numero(minutos / 60)} h`;
  return `Espera ${numero(minutos)} min`;
}

/**
 * O id que a Meta devolve quando o cliente toca no botão. O dono não precisa
 * vê-lo: sai do título, sem repetir entre os botões da mesma mensagem.
 */
export function idDoBotao(titulo: string, existentes: string[]): string {
  const base = semAcento(titulo).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'botao';
  let id = base;
  for (let n = 2; existentes.includes(id); n += 1) id = `${base}_${n}`;
  return id;
}

export type DestinoDaEdicao = { aba: 'textos'; foco: string } | { href: string } | null;

const EVENTOS_DO_ATENDIMENTO = new Set<string>(GRUPOS_DO_ATENDIMENTO.flatMap((g) => g.eventos));

/**
 * Do tipo que o registro de enviados devolve (`historico.py` no server2) para
 * onde o texto se edita. Tipo sem texto editável (reengajamento) não ganha
 * ação: link que leva a uma tela sem o texto é pior que nenhum.
 */
export function ondeEditar(tipo: string): DestinoDaEdicao {
  if (tipo === 'status') return { aba: 'textos', foco: 'pedido' };
  if (tipo.startsWith('cart_') || tipo === 'session_cart_reminder') {
    return { href: `/marketing/recuperacao#${ANCORA_DO_CARRINHO}` };
  }
  if (EVENTOS_DO_ATENDIMENTO.has(tipo)) return { aba: 'textos', foco: tipo };
  return null;
}
