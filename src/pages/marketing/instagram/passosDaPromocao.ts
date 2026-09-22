/**
 * A promoção em três decisões, não em dez campos.
 *
 * O primeiro desenho pedia nome, link do post, palavra, tipo, mensagem,
 * resposta pública, amigos e "segue" — tudo junto, numa tela só. Quem cria uma
 * promoção pensa em três coisas: em que post, o que a pessoa faz, o que ela
 * ganha.
 */
export type PassoId = 'publicacao' | 'regra' | 'premio';

export interface Rascunho {
  nome?: string;
  media_id?: string;
  palavra_chave?: string;
  mensagem_dm?: string;
}

export const PASSOS: { id: PassoId; titulo: string; ajuda: string }[] = [
  { id: 'publicacao', titulo: 'Em qual post', ajuda: 'A promoção vale nos comentários desta publicação.' },
  { id: 'regra', titulo: 'O que o cliente faz', ajuda: 'A palavra que ele comenta — e, se quiser, marcar amigos ou seguir.' },
  { id: 'premio', titulo: 'O que ele recebe', ajuda: 'A mensagem que chega no direct de quem participar.' },
];

/** Só o passo do post é pré-requisito: sem publicação não há promoção. */
export function passoLiberado(passo: PassoId, rascunho: Rascunho): boolean {
  if (passo === 'publicacao') return true;
  return !!rascunho.media_id?.trim();
}

/** Para onde a tela leva: o primeiro passo que ainda falta. `null` = pronto. */
export function primeiroPassoIncompleto(rascunho: Rascunho): PassoId | null {
  if (!rascunho.media_id?.trim()) return 'publicacao';
  if (!rascunho.mensagem_dm?.trim()) return 'premio';
  return null;
}
