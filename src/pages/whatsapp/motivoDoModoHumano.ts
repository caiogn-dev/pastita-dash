/**
 * Por que o bot parou de responder, em português de balcão.
 *
 * O backend manda um código (`pediu_atendente`, `eco_do_celular`…); o lojista
 * nunca vê o código. `outro` usa o texto que o backend mandou. Respostas
 * antigas da fila traziam o motivo já em texto — passa como veio.
 */
import type { MotivoDoModoHumano, PassoDoCarrinho } from '../../services/conversations';
import { haQuanto } from './tempoDeEspera';

const TEXTO: Record<string, string> = {
  pediu_atendente: 'Cliente pediu atendente',
  bot_nao_entendeu: 'O bot não entendeu o cliente',
  eco_do_celular: 'Alguém respondeu pelo WhatsApp do celular',
  atendente_assumiu: 'Um atendente assumiu a conversa',
};

const PADRAO = 'Atendimento humano';

export function rotuloDoMotivo(motivo: MotivoDoModoHumano | string | null | undefined): string {
  if (!motivo) return PADRAO;
  if (typeof motivo === 'string') return motivo.trim() || PADRAO;
  return TEXTO[motivo.codigo] ?? (motivo.texto?.trim() || PADRAO);
}

/** "Cliente pediu atendente há 12 min". Sem data, só o motivo. */
export function fraseDoMotivo(motivo: MotivoDoModoHumano | string | null | undefined, agora: number): string {
  const rotulo = rotuloDoMotivo(motivo);
  if (!motivo || typeof motivo === 'string' || !motivo.desde) return rotulo;
  const inicio = Date.parse(motivo.desde);
  if (!Number.isFinite(inicio)) return rotulo;
  return `${rotulo} ${haQuanto(Math.floor((agora - inicio) / 1000))}`;
}

const PASSO: Record<string, string> = {
  endereco: 'Parou pedindo o endereço',
  observacao: 'Parou pedindo observações',
  pagamento: 'Parou na forma de pagamento',
};

/** Em que ponto do pedido o bot estava; `null` quando não havia pedido em curso. */
export function rotuloDoPasso(passo: PassoDoCarrinho | null | undefined): string | null {
  return (passo && PASSO[passo]) || null;
}
