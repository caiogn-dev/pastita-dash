/**
 * Regras de venda do produto — espelho de server2 `services/regras_de_venda.py`.
 *
 * Do admin do Prefiro: "almoço só das 11h às 15h", "feijoada só sábado",
 * "bolo inteiro só retirada", "mínimo 10 salgados". Antes o dono desativava o
 * item à mão todo dia e esquecia de reativar. Quem barra é o servidor (checkout
 * e bot); aqui só se cadastra e se avisa do erro antes de salvar.
 */
export interface RegrasDeVenda {
  /** weekday() do Python: 0 = segunda … 6 = domingo. Vazio = todo dia. */
  dias?: number[];
  de?: string;
  ate?: string;
  so_retirada?: boolean;
  minimo?: number;
  maximo?: number;
}

export const DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Mesma recusa do servidor, para não descobrir o erro só no 400. */
export function problemaDasRegras(r: RegrasDeVenda | undefined): string | null {
  if (!r) return null;
  const de = (r.de ?? '').trim();
  const ate = (r.ate ?? '').trim();
  if (de || ate) {
    if (!HORA.test(de) || !HORA.test(ate)) return 'Preencha o início e o fim do horário de venda.';
    if (de === ate) return 'O horário de início e o de fim são iguais.';
    if (de > ate) return 'O horário de venda não pode virar a meia-noite.';
  }
  if (r.dias && r.dias.length === 0) return 'Escolha ao menos um dia de venda.';
  for (const v of [r.minimo, r.maximo]) {
    if (v != null && (!Number.isInteger(v) || v < 1 || v > 999)) return 'Quantidade por pedido vai de 1 a 999.';
  }
  if (r.minimo && r.maximo && r.minimo > r.maximo) return 'A quantidade mínima não pode passar da máxima.';
  return null;
}

/** O que vai para o servidor: só o que tem efeito ({} = sem regra). */
export function regrasParaGravar(r: RegrasDeVenda | undefined): RegrasDeVenda {
  const limpo: RegrasDeVenda = {};
  if (!r) return limpo;
  if (r.dias && r.dias.length > 0 && r.dias.length < 7) limpo.dias = [...new Set(r.dias)].sort((a, b) => a - b);
  if (r.de?.trim() && r.ate?.trim()) {
    limpo.de = r.de.trim();
    limpo.ate = r.ate.trim();
  }
  if (r.so_retirada) limpo.so_retirada = true;
  if (r.minimo && r.minimo > 1) limpo.minimo = r.minimo;
  if (r.maximo) limpo.maximo = r.maximo;
  return limpo;
}

/** "Seg a Sex · 11:00–15:00 · só retirada · mín. 10" — selo na lista. */
export function resumoDasRegras(r: RegrasDeVenda | undefined): string {
  const g = regrasParaGravar(r);
  const partes: string[] = [];
  if (g.dias) {
    const contiguos = g.dias.every((d, i) => i === 0 || d === g.dias![i - 1] + 1);
    partes.push(
      g.dias.length > 2 && contiguos
        ? `${DIAS_CURTOS[g.dias[0]]} a ${DIAS_CURTOS[g.dias[g.dias.length - 1]]}`
        : g.dias.map((d) => DIAS_CURTOS[d]).join(', '),
    );
  }
  if (g.de) partes.push(`${g.de}–${g.ate}`);
  if (g.so_retirada) partes.push('só retirada');
  if (g.minimo) partes.push(`mín. ${g.minimo}`);
  if (g.maximo) partes.push(`máx. ${g.maximo}`);
  return partes.join(' · ');
}
