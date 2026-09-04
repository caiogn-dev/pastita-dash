/**
 * Traz o segmento RFM do relatório para a ficha do cliente.
 *
 * O painel sabia classificar a base — campeão, leal, em risco, perdido — e
 * essa classificação vivia só na tela de relatórios. Quem abria a ficha de um
 * cliente para atendê-lo não tinha como saber se estava falando com o melhor
 * cliente da loja ou com alguém prestes a sumir. A informação existia e não
 * estava onde a decisão acontece.
 *
 * A JUNÇÃO É PELO TELEFONE, e é aí que este projeto já se queimou: o mesmo
 * número aparece em formatos diferentes conforme a porta de entrada — o
 * `wa_id` do WhatsApp vem sem o nono dígito, o checkout grava com ele, o
 * painel formata com parênteses, e o DDI 55 está em uns registros e não em
 * outros. Comparar string crua deixaria sem segmento exatamente o cliente
 * recorrente, que é quem entrou por vários canais.
 */

/** Últimos 8 dígitos: o que sobra depois de DDI, DDD e nono dígito. */
const CHAVE_MINIMA = 8;

const chaveDoTelefone = (telefone: string | null | undefined): string | null => {
  const digitos = String(telefone ?? '').replace(/\D/g, '');
  // Telefone curto (ou vazio) não vira chave: casar por prefixo daria a
  // "Campeão" a um cadastro sem telefone, que é pior que não mostrar nada.
  return digitos.length >= CHAVE_MINIMA ? digitos.slice(-CHAVE_MINIMA) : null;
};

export const segmentoPorTelefone = (
  doRelatorio: Array<{ phone?: string | null; segment?: string | null }>,
  telefoneDoCadastro: string | null | undefined,
): string | null => {
  const chave = chaveDoTelefone(telefoneDoCadastro);
  if (!chave) return null;
  const achado = doRelatorio.find((c) => chaveDoTelefone(c.phone) === chave);
  return achado?.segment ?? null;
};
