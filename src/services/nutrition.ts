import api from './api';

/**
 * Salvar a revisão de alergênicos de um ingrediente.
 *
 * Há dois tipos de ingrediente e eles não se salvam do mesmo jeito:
 *
 * - **da loja** (`store` preenchido): PATCH direto, é dele.
 * - **oficial** (TACO/POF, `store: null`): a base é compartilhada por todos os
 *   lojistas e o backend a trata como somente leitura. Marcar "sem glúten" num
 *   arroz mudaria o arroz da loja do vizinho. O caminho é ADOTAR: o backend
 *   cria uma cópia dentro da loja com a revisão já aplicada e reaponta as
 *   receitas daquela loja para a cópia.
 *
 * Até 12/ago o painel mandava PATCH nos dois casos. Como as 27 receitas em
 * produção usam ingredientes da base, o botão "revisar" respondia 400 sempre —
 * e nenhuma etiqueta conseguia declarar alergênico.
 */
export interface RevisaoDeAlergenicos {
  allergens: string[];
  may_contain: string[];
  allergens_reviewed: boolean;
}

export interface IngredienteRevisavel {
  id: string;
  /** `null` = alimento oficial da base compartilhada. */
  store: string | null;
}

export interface ResultadoDaRevisao {
  /** Id do ingrediente que ficou com a revisão — muda quando houve adoção. */
  id: string;
  /** true quando uma cópia da loja foi criada a partir do alimento oficial. */
  adotado: boolean;
}

export const salvarRevisaoDeAlergenicos = async (
  ingrediente: IngredienteRevisavel,
  revisao: RevisaoDeAlergenicos,
  storeUuid?: string,
): Promise<ResultadoDaRevisao> => {
  if (ingrediente.store) {
    await api.patch(`/nutrition/ingredients/${ingrediente.id}/`, revisao);
    return { id: ingrediente.id, adotado: false };
  }
  if (!storeUuid) {
    throw new Error('Selecione a loja antes de revisar um alimento oficial.');
  }
  const r = await api.post(`/nutrition/ingredients/${ingrediente.id}/adotar/`, {
    store: storeUuid,
    ...revisao,
  });
  return { id: r.data.id, adotado: true };
};

/** Adota um alimento oficial na loja sem mexer nos alergênicos. */
export const adotarIngrediente = async (
  ingredienteId: string,
  storeUuid: string,
  campos: Record<string, unknown> = {},
) => {
  const r = await api.post(`/nutrition/ingredients/${ingredienteId}/adotar/`, {
    store: storeUuid,
    ...campos,
  });
  return r.data;
};

/**
 * Ficha de custo do prato, como o servidor calcula (`apps/nutrition/services/custo.py`).
 *
 * Dinheiro chega como string do `DecimalField`. Qualquer campo em `null` é
 * "não dá para saber" — nunca zero: ingrediente sem preço deixa o custo do
 * prato em branco e aparece em `ingredientes_sem_preco`.
 */
export interface FichaDeCusto {
  custo_total: string | null;
  custo_por_porcao: string | null;
  ingredientes_sem_preco: string[];
  preco_de_venda: string | null;
  margem_bruta_valor: string | null;
  margem_bruta_pct: string | null;
  cmv_pct: string | null;
}

export interface CustoDoPrato extends FichaDeCusto {
  produto_id: string;
  produto: string;
  /** false = falta preço de ingrediente (ou o prato não tem preço de venda). */
  completo: boolean;
}

/** Custo e margem de todo prato com receita da loja, pior margem primeiro. */
export const buscarCustosDaLoja = async (storeUuid: string): Promise<CustoDoPrato[]> => {
  const r = await api.get('/nutrition/custos/', { params: { store: storeUuid } });
  return r.data;
};
