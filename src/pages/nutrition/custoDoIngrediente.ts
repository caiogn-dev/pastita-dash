/**
 * "Paguei R$ X por Y g/ml/un" → quanto custa 1 kg (ou 1 litro) na unidade da
 * receita. É o número que aparece AO LADO do campo enquanto a pessoa digita;
 * o que vale para o prato é o do servidor (`custo_por_g_ml`), que segue a
 * mesma regra em `apps/nutrition/services/custo.py`.
 *
 * Por mil e não por grama: sal a R$ 2/kg custa R$ 0,002/g, e com duas casas
 * de dinheiro isso viraria "R$ 0,00" — um ingrediente de graça que não existe.
 *
 * Entre g e ml só com densidade: 1 ml de azeite não pesa 1 g, e supor que sim
 * é inventar número. Sem como converter, devolve null.
 */
export interface CompraDoIngrediente {
  preco: string;
  quantidade: string;
  unidade: string;
  /** Quanto de g/ml vem em cada unidade, quando a compra é por unidade. */
  porUnidade: string;
  /** Unidade em que a receita pesa este ingrediente: 'g' ou 'ml'. */
  unidadeBase: string;
  densidade: string;
}

const numero = (valor: string): number | null => {
  if (!valor) return null;
  const n = Number(valor.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function custoPorMil(c: CompraDoIngrediente): number | null {
  const preco = numero(c.preco);
  const quantidade = numero(c.quantidade);
  if (preco === null || !quantidade || quantidade <= 0) return null;
  const densidade = numero(c.densidade);
  let naBase: number | null = null;
  if (c.unidade === c.unidadeBase) naBase = quantidade;
  else if (c.unidade === 'un') naBase = quantidade * (numero(c.porUnidade) || 0) || null;
  else if (c.unidade === 'ml' && c.unidadeBase === 'g' && densidade) naBase = quantidade * densidade;
  else if (c.unidade === 'g' && c.unidadeBase === 'ml' && densidade) naBase = quantidade / densidade;
  return naBase ? (preco / naBase) * 1000 : null;
}
