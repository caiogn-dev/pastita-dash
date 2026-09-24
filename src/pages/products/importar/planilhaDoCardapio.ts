/**
 * O que a tela de importação precisa dizer ao lojista.
 *
 * A conferência de verdade é do backend — ele é a fonte única do que é linha
 * válida. Aqui só se decide a PALAVRA: quantos entram, quantos falharam, e se
 * vale mesmo apertar o botão.
 */

export interface ItemConferido {
  nome: string;
  preco: string;
  categoria: string;
  descricao?: string;
}

/** De onde veio a conferência. `conferencia` = confirmação de linhas já vistas. */
export type Origem = 'planilha' | 'foto' | 'pdf' | 'conferencia';

export interface ErroDeLinha {
  linha: number;
  motivo: string;
}

export interface Conferencia {
  validos: ItemConferido[];
  erros: ErroDeLinha[];
  origem?: Origem;
}

/** Modelo de planilha para o dono baixar e preencher. */
export const MODELO_CSV =
  'Nome,Preço,Categoria,Descrição\n' +
  'Salada Caesar,"32,90",Saladas,Alface, frango grelhado e parmesão\n' +
  'Suco de Laranja,"9,00",Bebidas,\n';

export function resumoDaConferencia(c: Conferencia): string {
  const n = c.validos.length;
  const e = c.erros.length;
  // Foto não tem linha: falar de "linha" ali faz o dono procurar o que não existe.
  const daFoto = c.origem === 'foto' || c.origem === 'pdf';
  const [um, varios] = daFoto ? ['item', 'itens'] : ['linha', 'linhas'];
  if (n === 0 && e === 0) {
    return daFoto ? 'Não encontrei produtos no cardápio enviado.' : 'A planilha está vazia.';
  }
  if (n === 0) return `Nenhum produto pôde ser lido — ${e} ${e === 1 ? `${um} tem` : `${varios} têm`} problema.`;
  const entram = `${n} ${n === 1 ? 'produto entra' : 'produtos entram'} no cardápio`;
  if (e === 0) return `${entram}.`;
  // O número de falhas aparece SEMPRE que existe. Esconder atrás de um "ver
  // detalhes" faz o dono importar achando que veio tudo.
  return `${entram}. ${e} ${e === 1 ? `${um} ficou` : `${varios} ficaram`} de fora.`;
}

/** Dá para gravar? Sem um item válido não há o que importar. */
export function podeImportar(c: Conferencia | null): boolean {
  return !!c && c.validos.length > 0;
}

export function resumoDoResultado(r: { criados: number; atualizados: number }): string {
  const partes: string[] = [];
  if (r.criados > 0) partes.push(`${r.criados} ${r.criados === 1 ? 'produto novo' : 'produtos novos'}`);
  // "Atualizado" precisa aparecer separado de "criado": o dono que subiu a
  // planilha de novo para corrigir preço quer ver que ela ATUALIZOU, e não
  // que duplicou o cardápio dele.
  if (r.atualizados > 0) {
    partes.push(`${r.atualizados} ${r.atualizados === 1 ? 'atualizado' : 'atualizados'}`);
  }
  if (partes.length === 0) return 'Nada foi alterado.';
  return `${partes.join(' e ')}.`;
}


/**
 * Os nomes de coluna que o backend entende, trazidos para a tela.
 *
 * Eles viviam só em `SINONIMOS` no servidor. O lojista abria a planilha dele,
 * via "Produto" no cabeçalho, e não tinha como saber se servia — então
 * renomeava tudo à mão ou desistia. Espelhar aqui é o preço de não fazer o
 * dono adivinhar; se a lista do backend crescer, esta cresce junto.
 */
export interface ColunaAceita {
  chave: 'nome' | 'preco' | 'categoria' | 'descricao';
  titulo: string;
  exemplos: string[];
  obrigatoria: boolean;
}

export const COLUNAS_ACEITAS: ColunaAceita[] = [
  { chave: 'nome',      titulo: 'Nome do produto', obrigatoria: true,
    exemplos: ['Nome', 'Produto', 'Item'] },
  { chave: 'preco',     titulo: 'Preço',           obrigatoria: true,
    exemplos: ['Preço', 'Valor'] },
  { chave: 'categoria', titulo: 'Categoria',       obrigatoria: false,
    exemplos: ['Categoria', 'Seção', 'Grupo'] },
  { chave: 'descricao', titulo: 'Descrição',       obrigatoria: false,
    exemplos: ['Descrição', 'Ingredientes', 'Detalhes'] },
];

/** Formatos que a tela aceita de verdade. */
export const FORMATOS_ACEITOS = 'Excel (.xlsx) ou CSV';
