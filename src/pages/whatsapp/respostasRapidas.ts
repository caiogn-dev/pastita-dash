/**
 * Respostas rápidas do inbox — o texto que o atendente digita dez vezes por dia.
 *
 * Moram em `store.metadata.respostas_rapidas` como `[{atalho, texto}]`. No
 * composer, digitar `/` abre a mesma paleta dos comandos: a resposta rápida
 * vira TEXTO na caixa (o atendente ainda lê e envia), o comando vira AÇÃO.
 *
 * Por isso atalho nunca pode ter o nome de um comando: `/pix` gera cobrança.
 * Uma resposta chamada "pix" faria o Enter decidir entre mandar um texto e
 * cobrar a cliente — as sugestões padrão usam "pagamento" e "menu" por isso.
 */
import { COMANDOS } from './comandos';

export interface RespostaRapida {
  atalho: string;
  texto: string;
}

export const CHAVE_RESPOSTAS_RAPIDAS = 'respostas_rapidas';

/** Sugestões da primeira vez. `{nome}` e `{cardapio}` são trocados ao inserir. */
export function respostasPadrao(): RespostaRapida[] {
  return [
    {
      atalho: 'frete',
      texto: 'Oi {nome}! A taxa de entrega depende do bairro. Me manda seu endereço que eu calculo para você.',
    },
    {
      atalho: 'pagamento',
      texto: 'Aceitamos PIX, cartão e dinheiro. No PIX, mandamos o código assim que o pedido for confirmado.',
    },
    {
      atalho: 'horario',
      texto: 'Nosso horário de funcionamento fica sempre atualizado no cardápio: {cardapio}',
    },
    {
      atalho: 'menu',
      texto: 'Aqui está o nosso cardápio, {nome}: {cardapio}\nÉ só escolher e pedir por lá, ou me dizer por aqui.',
    },
  ];
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function normalizarAtalho(bruto: string): string {
  return semAcento(bruto || '')
    .toLowerCase()
    .trim()
    .replace(/^\/+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const ehResposta = (x: unknown): x is RespostaRapida =>
  !!x && typeof x === 'object'
  && typeof (x as RespostaRapida).atalho === 'string'
  && typeof (x as RespostaRapida).texto === 'string';

/**
 * Lê do metadata. Sem nada gravado → sugestões padrão (`padrao: true`).
 * Lista gravada, mesmo vazia, é respeitada: o lojista pode ter apagado tudo.
 */
export function lerRespostasRapidas(
  metadata: Record<string, unknown> | null | undefined,
): { respostas: RespostaRapida[]; padrao: boolean } {
  const bruto = metadata?.[CHAVE_RESPOSTAS_RAPIDAS];
  if (!Array.isArray(bruto)) return { respostas: respostasPadrao(), padrao: true };
  return {
    respostas: bruto.filter(ehResposta).map((r) => ({ atalho: r.atalho, texto: r.texto })),
    padrao: false,
  };
}

/** O que vem depois da barra, se o texto ainda é "barra + palavra". */
function prefixoDigitado(texto: string): string | null {
  const t = texto || '';
  if (!t.startsWith('/')) return null;
  const corpo = t.slice(1);
  if (/\s/.test(corpo)) return null;
  return normalizarAtalho(corpo);
}

/** Respostas que combinam com o que está na caixa: começo primeiro, meio depois. */
export function filtrarRespostas(respostas: RespostaRapida[], texto: string): RespostaRapida[] {
  const prefixo = prefixoDigitado(texto);
  if (prefixo === null) return [];
  if (!prefixo) return respostas;
  const comeca = respostas.filter((r) => normalizarAtalho(r.atalho).startsWith(prefixo));
  const contem = respostas.filter(
    (r) => !comeca.includes(r) && normalizarAtalho(r.atalho).includes(prefixo),
  );
  return [...comeca, ...contem];
}

/**
 * A resposta que o Enter insere, ou null quando o Enter deve seguir o caminho
 * de sempre (enviar/executar comando). Comando digitado por inteiro ganha.
 */
export function atalhoDoEnter(respostas: RespostaRapida[], texto: string): RespostaRapida | null {
  const prefixo = prefixoDigitado(texto);
  if (!prefixo) return null;
  if (COMANDOS.some((c) => c.nome === prefixo)) return null;
  return filtrarRespostas(respostas, texto)[0] ?? null;
}

export interface VariaveisDaResposta {
  nome?: string | null;
  cardapio?: string | null;
}

export function aplicarVariaveis(texto: string, vars: VariaveisDaResposta): string {
  const primeiroNome = (vars.nome || '').trim().split(/\s+/)[0] || '';
  const cardapio = (vars.cardapio || '').trim();
  const trocar = (t: string, chave: string, valor: string) =>
    valor ? t.split(`{${chave}}`).join(valor) : t.replace(new RegExp(` ?\\{${chave}\\}`, 'g'), '');
  return trocar(trocar(texto, 'nome', primeiroNome), 'cardapio', cardapio);
}

/** Mensagem de erro para o lojista, ou null quando dá para salvar. */
export function validarResposta(
  resposta: RespostaRapida,
  lista: RespostaRapida[],
  indiceEditado: number,
): string | null {
  const atalho = normalizarAtalho(resposta.atalho);
  if (!atalho) return 'Escreva um atalho, por exemplo: frete.';
  if (!resposta.texto.trim()) return 'Escreva o texto que vai para a cliente.';
  if (COMANDOS.some((c) => c.nome === atalho)) {
    return `/${atalho} já é um comando do atendimento. Escolha outro atalho.`;
  }
  const repetido = lista.some((r, i) => i !== indiceEditado && normalizarAtalho(r.atalho) === atalho);
  if (repetido) return `O atalho /${atalho} já existe.`;
  return null;
}
