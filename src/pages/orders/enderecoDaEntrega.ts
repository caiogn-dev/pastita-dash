/**
 * O endereço de entrega em linhas que uma pessoa lê em voz alta.
 *
 * A versão anterior (`buildCompactAddress`) juntava tudo numa string só com
 * ` · ` e ` • ` e cometia dois erros de lados opostos:
 *
 * 1. DESCARTAVA o complemento. "Recepção da ortolife, espaço life" é o que faz
 *    a entrega chegar — em 52 dos 115 pedidos de entrega da Cê Saladas o
 *    complemento existia e não aparecia na tela.
 * 2. REPETIA o que a rua já dizia. Quando o checkout grava o endereço formatado
 *    inteiro dentro de `street` (4 pedidos), a concatenação cuspia bairro e
 *    cidade três vezes na mesma linha (pedido CE-2609098839).
 *
 * Por isso cada parte só entra se ainda não apareceu: a rua é a fonte, o resto
 * complementa.
 */

export interface EnderecoDeEntrega {
  /** Linhas prontas para exibir, na ordem de leitura. Nunca vazias por dentro. */
  linhas: string[];
  /** O bairro isolado — é por ele que se decide a rota e a taxa. */
  bairro: string | null;
  /** Link para abrir no mapa, ou `null` quando não há endereço nenhum. */
  mapa: string | null;
  /** Sem nada para mostrar: a tela esconde o bloco em vez de desenhar vazio. */
  vazio: boolean;
}

type Bruto = Record<string, unknown>;

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : v ? String(v).trim() : '');

/**
 * Sem acento, sem caixa e sem espaço sobrando.
 *
 * "Centro" e "centro" são a mesma palavra; e o mesmo endereço digitado
 * "ortolife , espaço" e "ortolife, espaço" também. Sem normalizar o espaço
 * antes da pontuação, o complemento aparecia de novo como linha própria
 * embaixo da rua que já o continha.
 */
const normalizar = (s: string) =>
  s.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+([,;.\-])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `parte` já está dita em `acumulado`? Compara por palavra inteira, para
 *  "TO" não casar dentro de "ortolife". */
const jaFoiDito = (acumulado: string, parte: string) => {
  const p = normalizar(parte);
  if (!p) return true;
  return new RegExp(`(^|\\W)${escapar(p)}(\\W|$)`).test(normalizar(acumulado));
};

/**
 * Tira a repetição de DENTRO de um campo.
 *
 * O checkout de alguns pedidos grava o endereço formatado inteiro — e às vezes
 * duas vezes — dentro de `street`. Deduplicar entre campos não alcança isso: a
 * repetição mora num campo só. Quebramos por vírgula e hífen, que é como o
 * endereço foi montado, e mantemos a primeira ocorrência de cada pedaço.
 */
function semRepeticaoInterna(valor: string): string {
  const pedacos = valor.split(/\s*,\s*/).filter(Boolean);
  const vistos = new Set<string>();
  const mantidos: string[] = [];
  for (const pedaco of pedacos) {
    const chave = normalizar(pedaco);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    mantidos.push(pedaco);
  }
  return mantidos.join(', ');
}

export function enderecoDaEntrega(bruto: Bruto | null | undefined): EnderecoDeEntrega {
  const d = bruto || {};
  const rua = semRepeticaoInterna(texto(d.street) || texto(d.address));
  const numero = texto(d.number);
  const complemento = texto(d.complement);
  const referencia = texto(d.reference);
  const bairro = texto(d.neighborhood);
  const cidade = texto(d.city);
  const uf = texto(d.state);
  const cep = texto(d.zip_code) || texto(d.cep);
  const livre = texto(d.raw_address) || texto(d.formatted);

  const linhas: string[] = [];
  const empilhar = (linha: string) => {
    if (linha) linhas.push(linha);
  };
  /** Tudo que já está escrito — a régua contra repetição. */
  const dito = () => linhas.join(' | ');

  // Linha 1: onde é. O número só entra se a rua já não o carregar.
  if (rua) empilhar(numero && !jaFoiDito(rua, numero) ? `${rua}, ${numero}` : rua);
  else if (numero) empilhar(numero);

  // Linha 2 e 3: o que o entregador precisa depois de chegar na porta.
  if (complemento && !jaFoiDito(dito(), complemento)) empilhar(complemento);
  if (referencia && !jaFoiDito(dito(), referencia)) empilhar(referencia);

  // Linha 4: a localização ampla, só com o que ainda não foi dito.
  const ampla = dito();
  const cidadeUf = [cidade, uf].filter(Boolean).join('/');
  const meta = [
    bairro && !jaFoiDito(ampla, bairro) ? bairro : '',
    cidade && !jaFoiDito(ampla, cidade) ? cidadeUf : '',
    cep && !jaFoiDito(ampla, cep) ? cep : '',
  ].filter(Boolean);
  empilhar(meta.join(' · '));

  // Nenhum campo estruturado: sobra o texto livre que o cliente escreveu.
  if (linhas.length === 0 && livre) empilhar(livre);

  const lat = texto(d.lat) || texto(d.latitude);
  const lng = texto(d.lng) || texto(d.longitude);
  const mapsUrl = texto(d.maps_url);

  let mapa: string | null = null;
  if (mapsUrl) {
    // O link que o próprio pedido trouxe vence: foi ele que o cliente mandou.
    mapa = mapsUrl;
  } else if (lat && lng) {
    mapa = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  } else if (linhas.length) {
    mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(linhas.join(', '))}`;
  }

  return {
    linhas,
    bairro: bairro || null,
    mapa,
    vazio: linhas.length === 0,
  };
}
