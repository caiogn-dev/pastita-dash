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
}

export interface ErroDeLinha {
  linha: number;
  motivo: string;
}

export interface Conferencia {
  validos: ItemConferido[];
  erros: ErroDeLinha[];
}

/** Modelo de planilha para o dono baixar e preencher. */
export const MODELO_CSV =
  'Nome,Preço,Categoria,Descrição\n' +
  'Salada Caesar,"32,90",Saladas,Alface, frango grelhado e parmesão\n' +
  'Suco de Laranja,"9,00",Bebidas,\n';

export function resumoDaConferencia(c: Conferencia): string {
  const n = c.validos.length;
  const e = c.erros.length;
  if (n === 0 && e === 0) return 'A planilha está vazia.';
  if (n === 0) return `Nenhum produto pôde ser lido — ${e} ${e === 1 ? 'linha tem' : 'linhas têm'} problema.`;
  const entram = `${n} ${n === 1 ? 'produto entra' : 'produtos entram'} no cardápio`;
  if (e === 0) return `${entram}.`;
  // O número de falhas aparece SEMPRE que existe. Esconder atrás de um "ver
  // detalhes" faz o dono importar achando que veio tudo.
  return `${entram}. ${e} ${e === 1 ? 'linha ficou' : 'linhas ficaram'} de fora.`;
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
