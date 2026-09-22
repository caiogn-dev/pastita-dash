/**
 * O nome do plano vem do catálogo, nunca de uma lista escrita à mão na tela.
 *
 * Até 21/09 a tela de Assinatura tinha a própria tabela de nomes: chamava o
 * plano de "Pro" e "Premium" enquanto o catálogo dizia "Loja + WhatsApp" e
 * "Rede", e não conhecia o "starter" — quem estava nele lia a palavra crua
 * "starter" na tela. Dois nomes para a mesma coisa é o lojista achando que
 * assinou outro plano.
 */
export interface PlanoComNome {
  key: string;
  name?: string;
}

export function nomeDoPlano(chave: string | null | undefined, catalogo: PlanoComNome[]): string {
  if (!chave) return '';
  const doCatalogo = catalogo.find((p) => p.key === chave)?.name;
  if (doCatalogo) return doCatalogo;
  // Catálogo ainda carregando ou plano fora dele: pelo menos não mostra "starter".
  return chave.charAt(0).toUpperCase() + chave.slice(1);
}
