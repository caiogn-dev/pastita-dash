/**
 * Nome de nutriente como está na etiqueta, não como está no banco.
 *
 * A tela mostrava "added_sugars_g, saturated_fat_g, sodium_mg" para o dono da
 * loja. Nome de coluna não é vocabulário de quem monta cardápio.
 */
const ROTULOS: Record<string, string> = {
  energy_kcal: 'valor energético',
  carbohydrates_g: 'carboidratos',
  total_sugars_g: 'açúcares totais',
  added_sugars_g: 'açúcar adicionado',
  protein_g: 'proteínas',
  total_fat_g: 'gorduras totais',
  saturated_fat_g: 'gordura saturada',
  trans_fat_g: 'gordura trans',
  fiber_g: 'fibra alimentar',
  sodium_mg: 'sódio',
};

export function rotuloDeNutriente(campo: string): string {
  return ROTULOS[campo] || campo.replace(/_/g, ' ');
}

/** "sódio, gordura saturada e açúcar adicionado" — lista como se fala. */
export function listaDeNutrientes(campos: string[] = []): string {
  const nomes = campos.map(rotuloDeNutriente);
  if (nomes.length <= 1) return nomes[0] || '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

/**
 * Junta nomes próprios do mesmo jeito. Serve para dizer QUEM causou a falta:
 * um ingrediente sem dado anula o nutriente da receita inteira, e mostrar só
 * o nutriente deixa a pessoa procurando o culpado.
 */
export function listaDeNomes(nomes: string[] = []): string {
  if (nomes.length <= 1) return nomes[0] || '';
  if (nomes.length > 3) return `${nomes.slice(0, 3).join(', ')} e mais ${nomes.length - 3}`;
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

/**
 * Número de nutriente como se lê numa tabela: "373", "13,3", "0,3".
 * O banco guarda 4 casas ("373.3333"); a tela mostrava isso cru.
 * kcal e mg sem casa decimal; gramas com até 1 casa. Vazio é travessão, nunca zero.
 */
export function formatarNutriente(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  const inteiro = campo.endsWith('_kcal') || campo.endsWith('_mg');
  return n.toLocaleString('pt-BR', { maximumFractionDigits: inteiro ? 0 : 1, minimumFractionDigits: 0 });
}

/** Unidade do nutriente para rótulo curto. */
export function unidadeDeNutriente(campo: string): string {
  if (campo.endsWith('_kcal')) return 'kcal';
  if (campo.endsWith('_mg')) return 'mg';
  return 'g';
}
