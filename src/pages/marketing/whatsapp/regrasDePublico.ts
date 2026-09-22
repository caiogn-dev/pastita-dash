/**
 * As contas puras do construtor de público.
 *
 * O vocabulário (campos e operadores) vem do SERVIDOR — ver
 * `campaignsService.camposDaAudiencia`. Este módulo só cuida do que é decisão
 * de tela: quantos campos de valor mostrar, se a condição está completa e como
 * mexer nos grupos sem espalhar `slice`/`splice` pelo componente.
 */

export interface Condicao {
  campo?: string;
  operador?: string;
  valor?: string | number | (string | number)[];
}

export interface Grupo {
  condicoes: Condicao[];
}

export interface Regra {
  grupos: Grupo[];
}

export interface CampoDoCatalogo {
  campo: string;
  rotulo: string;
  tipo: 'numero' | 'texto' | 'data' | 'lista';
  formato?: string;
  fonte?: string;
  operadores: string[];
  operadores_detalhe: { operador: string; rotulo: string; valores?: number; unidade?: string }[];
}

export const REGRA_VAZIA: Regra = { grupos: [{ condicoes: [{}] }] };

/** Quantas caixas de valor este operador pede. "está entre" pede duas. */
export function quantosValores(campo: CampoDoCatalogo | undefined, operador?: string): number {
  if (!campo || !operador) return 1;
  return campo.operadores_detalhe.find((o) => o.operador === operador)?.valores ?? 1;
}

/** Condição só conta quando tem os três pedaços — meia condição é rascunho. */
export function condicaoCompleta(c: Condicao): boolean {
  if (!c.campo || !c.operador) return false;
  if (Array.isArray(c.valor)) return c.valor.length > 0 && c.valor.every((v) => v !== '' && v != null);
  return c.valor !== '' && c.valor != null;
}

/** A regra que vale para o servidor: só o que está completo. */
export function regraLimpa(regra: Regra): Regra {
  const grupos = regra.grupos
    .map((g) => ({ condicoes: g.condicoes.filter(condicaoCompleta) }))
    .filter((g) => g.condicoes.length > 0);
  return { grupos };
}

export function temAlgumaCondicao(regra: Regra): boolean {
  return regraLimpa(regra).grupos.length > 0;
}

// ── mexer nos grupos ─────────────────────────────────────────────────────────

export const adicionarCondicao = (r: Regra, iGrupo: number): Regra => ({
  grupos: r.grupos.map((g, i) => (i === iGrupo ? { condicoes: [...g.condicoes, {}] } : g)),
});

export const removerCondicao = (r: Regra, iGrupo: number, iCondicao: number): Regra => {
  const grupos = r.grupos
    .map((g, i) => (i === iGrupo
      ? { condicoes: g.condicoes.filter((_, j) => j !== iCondicao) }
      : g))
    // Grupo que ficou sem condição some — grupo vazio na tela é caixa fantasma.
    .filter((g) => g.condicoes.length > 0);
  return { grupos: grupos.length ? grupos : REGRA_VAZIA.grupos };
};

export const adicionarGrupo = (r: Regra): Regra => ({
  grupos: [...r.grupos, { condicoes: [{}] }],
});

export const mudarCondicao = (
  r: Regra, iGrupo: number, iCondicao: number, mudanca: Partial<Condicao>,
): Regra => ({
  grupos: r.grupos.map((g, i) => (i !== iGrupo ? g : {
    condicoes: g.condicoes.map((c, j) => {
      if (j !== iCondicao) return c;
      // Trocar o campo zera operador e valor: operador de número não serve
      // para texto, e deixar o antigo manda condição inválida ao servidor.
      if (mudanca.campo && mudanca.campo !== c.campo) return { campo: mudanca.campo };
      if (mudanca.operador && mudanca.operador !== c.operador) {
        return { ...c, operador: mudanca.operador, valor: undefined };
      }
      return { ...c, ...mudanca };
    }),
  })),
});
