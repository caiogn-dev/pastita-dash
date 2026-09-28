/**
 * Regras puras da tela "Promoção do dia".
 */
import type { ConfigDaPromoDoDia } from '../../../services/promoDoDia';

export const CHAVE_PROMO = 'promo_do_dia';

export const DIAS: { valor: string; rotulo: string }[] = [
  { valor: '0', rotulo: 'Segunda' }, { valor: '1', rotulo: 'Terça' }, { valor: '2', rotulo: 'Quarta' },
  { valor: '3', rotulo: 'Quinta' }, { valor: '4', rotulo: 'Sexta' }, { valor: '5', rotulo: 'Sábado' },
  { valor: '6', rotulo: 'Domingo' },
];

export const TEXTO_PADRAO = 'Oi, {nome}! 🥗\n\n{dia} tem oferta na {loja}:\n\n{ofertas}\n\nPeça pelo cardápio: {cardapio}';

export const CONFIG_PADRAO: ConfigDaPromoDoDia = {
  // Sempre a véspera: às 18h de segunda sai a de terça. Não é opção.
  ativo: false, hora: '18:00', para: 'amanha', modo: 'janela', modelo: '', cards: {}, texto: TEXTO_PADRAO,
};

/** Mensagem do motivo devolvido pelo "Enviar agora". */
export function explicarMotivo(motivo: string): { ok: boolean; texto: string } {
  switch (motivo) {
    case 'janela': return { ok: true, texto: 'Campanha criada. Sai de graça para quem falou com a loja nas últimas 24 h, ao longo do dia.' };
    case 'modelo': return { ok: true, texto: 'Campanha criada com o modelo aprovado. Está saindo para todos os contatos.' };
    case 'ja_saiu': return { ok: false, texto: 'A promoção desse dia já foi enviada hoje. Veja no histórico.' };
    case 'sem_promocao': return { ok: false, texto: 'Não há promoção cadastrada para esse dia. Marque o dia e o preço promocional no produto.' };
    case 'sem_contatos': return { ok: false, texto: 'A loja ainda não tem contatos: ninguém falou nem pediu por aqui.' };
    case 'sem_whatsapp': return { ok: false, texto: 'A loja não tem WhatsApp conectado.' };
    default: return { ok: false, texto: 'Não consegui enviar agora.' };
  }
}

/** Erro de validação da configuração, ou '' quando pode salvar. */
export function validarConfig(c: ConfigDaPromoDoDia): string {
  if (!/^\d{2}:\d{2}$/.test(c.hora)) return 'Informe a hora no formato 18:00.';
  const [h, m] = c.hora.split(':').map(Number);
  if (h < 8 || h > 21 || m > 59) return 'Envie entre 08:00 e 21:00: fora disso a Meta trata como spam e o cliente também.';
  if (c.modo === 'modelo' && !c.modelo) return 'Escolha o modelo aprovado para o envio pago.';
  if (!c.texto.trim()) return 'Escreva o texto da mensagem.';
  return '';
}
