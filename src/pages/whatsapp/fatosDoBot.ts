/**
 * O que a loja confirmou para a IA — os fatos que ela pode afirmar.
 *
 * 28/09: "quantos dias dura a salada na geladeira?" e a IA respondeu "até 24
 * horas", inventado. Proibir de inventar sem dar a fonte só troca o chute por
 * um chute educado. Aqui o dono escreve o que é verdade na loja dele; o
 * backend põe no prompt com a ordem "o que não está aqui, diga que vai
 * confirmar".
 *
 * Moram em `store.metadata.bot_fatos` como `[{tema, texto, ativo}]`, ao lado
 * das respostas rápidas. O PATCH substitui o metadata inteiro: o resto vai junto.
 */
export type TemaDeFato = 'loja' | 'produtos' | 'entrega' | 'pagamento' | 'horarios' | 'outro';

export interface FatoDoBot {
  tema: TemaDeFato;
  texto: string;
  ativo: boolean;
}

export const CHAVE_FATOS = 'bot_fatos';

export const TEMAS_DE_FATO: { valor: TemaDeFato; rotulo: string; exemplo: string }[] = [
  { valor: 'produtos', rotulo: 'Produtos', exemplo: 'A salada dura até 2 dias na geladeira, fechada.' },
  { valor: 'entrega', rotulo: 'Entrega', exemplo: 'Entregamos em Taquaralto só de segunda a sexta, até as 14h.' },
  { valor: 'pagamento', rotulo: 'Pagamento', exemplo: 'Aceitamos vale-refeição (VR e VA) só na retirada.' },
  { valor: 'horarios', rotulo: 'Horários', exemplo: 'Em feriado abrimos das 11h às 15h.' },
  { valor: 'loja', rotulo: 'Sobre a loja', exemplo: 'Temos estacionamento na frente e aceitamos encomendas para eventos.' },
  { valor: 'outro', rotulo: 'Outros', exemplo: 'Não fazemos salada sem cebola por encomenda; é só pedir na observação.' },
];

export const rotuloDoTema = (tema: string): string =>
  TEMAS_DE_FATO.find((t) => t.valor === tema)?.rotulo ?? 'Outros';

const ehTema = (x: unknown): x is TemaDeFato => TEMAS_DE_FATO.some((t) => t.valor === x);

/** Lê do metadata; ignora o que não tem a forma (o metadata é editado por gente). */
export function lerFatos(metadata: unknown): FatoDoBot[] {
  const brutos = (metadata as { [CHAVE_FATOS]?: unknown } | null | undefined)?.[CHAVE_FATOS];
  if (!Array.isArray(brutos)) return [];
  return brutos.flatMap((f) => {
    if (!f || typeof f !== 'object') return [];
    const { tema, texto, ativo } = f as { tema?: unknown; texto?: unknown; ativo?: unknown };
    if (typeof texto !== 'string' || !texto.trim()) return [];
    return [{ tema: ehTema(tema) ? tema : 'outro', texto: texto.trim(), ativo: ativo !== false }];
  });
}

export const LIMITE_DO_FATO = 300;

/** Mensagem de erro, ou '' quando o fato pode ser salvo. `indice` é o que está sendo editado. */
export function validarFato(fato: FatoDoBot, existentes: FatoDoBot[], indice = -1): string {
  const texto = fato.texto.trim();
  if (!texto) return 'Escreva o fato.';
  if (texto.length > LIMITE_DO_FATO) return `Fato longo demais: no máximo ${LIMITE_DO_FATO} caracteres. Divida em dois.`;
  const igual = existentes.findIndex((f, i) => i !== indice && f.texto.trim().toLowerCase() === texto.toLowerCase());
  if (igual >= 0) return 'Esse fato já está na lista.';
  return '';
}
