/**
 * As contas puras da promoção de comentário.
 *
 * A frase pública é o que a loja copia para a legenda do post: se a regra da
 * tela e o texto do post não baterem, o cliente comenta errado e culpa a loja.
 */

export interface RegraDaPromocao {
  nome?: string;
  media_id?: string;
  mensagem_dm?: string;
  palavra_chave?: string;
  exige_marcar_amigos?: number;
  exige_seguir?: boolean;
}

export function frasePublica(regra: RegraDaPromocao): string {
  const partes: string[] = [];
  partes.push(
    regra.palavra_chave?.trim()
      ? `Comente "${regra.palavra_chave.trim()}"`
      : 'Comente na publicação',
  );
  const amigos = Number(regra.exige_marcar_amigos ?? 0);
  if (amigos > 0) partes.push(`marque ${amigos} ${amigos === 1 ? 'amigo' : 'amigos'}`);
  if (regra.exige_seguir) partes.push('siga a loja');

  const ultimo = partes.pop() as string;
  const texto = partes.length ? `${partes.join(', ')} e ${ultimo}` : ultimo;
  return `${texto} para receber no direct.`;
}

export function problemasDaPromocao(regra: RegraDaPromocao): string[] {
  const problemas: string[] = [];
  if (!regra.nome?.trim()) problemas.push('Dê um nome à promoção para achar depois.');
  if (!regra.media_id?.trim()) problemas.push('Escolha a publicação em que a promoção vale.');
  if (!regra.mensagem_dm?.trim()) problemas.push('Escreva a mensagem que vai chegar no direct.');
  return problemas;
}

/**
 * A loja tem o link do post, não o código dele. Aceita os dois.
 */
export function idDaPublicacao(valor: string): string {
  const limpo = (valor || '').trim();
  const link = limpo.match(/instagram\.com\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  return link ? link[1] : limpo;
}
