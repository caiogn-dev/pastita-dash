/**
 * Ler o `content` de uma mensagem do WhatsApp.
 * ESPECIFICAÇÃO em `__tests__/conteudoDaMensagem.spec.ts`.
 *
 * Ele chega em três formas: string com JSON dentro, objeto já pronto, ou texto
 * puro que NÃO é JSON. A terceira é a que derruba — `JSON.parse('bom dia')`
 * lança e leva a conversa inteira junto.
 *
 * Existia o mesmo `try/catch` copiado quatro vezes, cada cópia com um detalhe
 * diferente, e a leitura era toda com `as any` — que apaga a checagem
 * justamente onde o formato vem de fora e muda sem aviso.
 */
export type ConteudoDeMensagem = unknown;

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** O conteúdo como objeto de leitura. Nunca lança, nunca devolve nulo. */
export const comoObjeto = (conteudo: ConteudoDeMensagem): Record<string, unknown> => {
  if (ehObjeto(conteudo)) return conteudo;
  if (typeof conteudo !== 'string') return {};

  try {
    const lido: unknown = JSON.parse(conteudo);
    // Promete OBJETO: devolver um array faria `.emoji` virar `undefined`
    // silenciosamente lá na frente.
    return ehObjeto(lido) ? lido : {};
  } catch {
    return {};
  }
};

/**
 * O primeiro campo de texto que existir, na ordem pedida.
 *
 * A ordem importa: o WhatsApp manda `text` em uns eventos e `title` em outros,
 * e o painel quer o mais específico primeiro.
 */
export const textoDe = (
  objeto: Record<string, unknown>,
  ...chaves: string[]
): string | undefined => {
  for (const chave of chaves) {
    const valor = objeto[chave];
    // Vazio não conta: o botão apareceria com o rótulo em branco.
    if (typeof valor === 'string' && valor !== '') return valor;
  }
  return undefined;
};

/**
 * Um número, quando o campo for número de verdade.
 *
 * O WhatsApp manda coordenada às vezes como número, às vezes como string. As
 * duas viram número aqui; qualquer outra coisa vira `undefined`, e não NaN —
 * `NaN.toFixed(6)` imprime "NaN" na tela, no lugar da latitude.
 */
export const numeroDe = (
  objeto: Record<string, unknown>,
  chave: string,
): number | undefined => {
  const valor = objeto[chave];
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : undefined;
  if (typeof valor !== 'string' || valor.trim() === '') return undefined;
  const n = Number(valor);
  return Number.isFinite(n) ? n : undefined;
};

/** Uma lista, ou lista vazia — assim quem chama sempre pode ler `.length`. */
export const listaDe = (objeto: Record<string, unknown>, chave: string): unknown[] => {
  const valor = objeto[chave];
  return Array.isArray(valor) ? valor : [];
};
