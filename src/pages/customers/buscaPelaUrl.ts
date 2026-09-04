/**
 * A ponte entre o relatório e a ficha do cliente.
 *
 * O painel sabia quem estava EM RISCO (seção CRM dos relatórios) e sabia
 * listar clientes (página Clientes) — e as duas telas não se falavam. Para
 * agir sobre a pessoa apontada, o dono decorava o nome, ia em Clientes e
 * procurava na mão. A informação mais acionável do painel morria a um passo
 * da ação.
 *
 * Duas funções pequenas, uma de cada lado da ponte, para que o formato do
 * link exista num lugar só: quem monta e quem lê nunca divergem.
 */

/** O termo que a página de Clientes começa filtrando. */
export const buscaInicialDaUrl = (params: URLSearchParams): string =>
  (params.get('busca') ?? '').trim();

/**
 * Link do relatório para a ficha, chaveado por TELEFONE.
 *
 * Nome não serve de chave: vem do checkout como o cliente digitou — "ana",
 * "Ana Paula", "ANA P." — e repete entre pessoas. O telefone é o campo que o
 * relatório de RFM e o cadastro de cliente compartilham, e é por ele que a
 * busca de Clientes casa (ela compara só os dígitos).
 *
 * Devolve `null` quando não há por onde buscar: link que cai numa lista
 * inteira é pior que link nenhum, porque promete precisão e entrega ruído.
 */
export const urlDeClienteBuscado = (
  cliente: { phone?: string | null; name?: string | null },
): string | null => {
  const termo = (cliente.phone || '').trim() || (cliente.name || '').trim();
  if (!termo) return null;
  return `/customers?${new URLSearchParams({ busca: termo }).toString()}`;
};
