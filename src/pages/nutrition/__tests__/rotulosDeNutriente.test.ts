import { listaDeNomes, listaDeNutrientes, rotuloDeNutriente } from '../rotulosDeNutriente';

/**
 * A tela mostrava "added_sugars_g, saturated_fat_g, sodium_mg" para o dono da
 * loja, e listava os três como se fossem três problemas — quando o que faltava
 * era um único ingrediente sem dado, que anula o nutriente da receita inteira.
 */
describe('rótulos de nutriente', () => {
  it('usa o nome da etiqueta, não o da coluna', () => {
    expect(rotuloDeNutriente('added_sugars_g')).toBe('açúcar adicionado');
    expect(rotuloDeNutriente('saturated_fat_g')).toBe('gordura saturada');
    expect(rotuloDeNutriente('sodium_mg')).toBe('sódio');
  });

  it('campo desconhecido não vira erro na tela', () => {
    expect(rotuloDeNutriente('campo_novo_g')).toBe('campo novo g');
  });

  it('lista nutrientes como se fala', () => {
    expect(listaDeNutrientes(['sodium_mg'])).toBe('sódio');
    expect(listaDeNutrientes(['sodium_mg', 'saturated_fat_g']))
      .toBe('sódio e gordura saturada');
    expect(listaDeNutrientes(['added_sugars_g', 'saturated_fat_g', 'sodium_mg']))
      .toBe('açúcar adicionado, gordura saturada e sódio');
  });

  it('lista vazia não vira "e"', () => {
    expect(listaDeNutrientes([])).toBe('');
    expect(listaDeNomes([])).toBe('');
  });

  it('corta lista longa de nomes em vez de despejar dez', () => {
    // Dez ingredientes numa linha só é a mesma parede de texto de antes.
    expect(listaDeNomes(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C e mais 2');
  });

  it('até três nomes aparecem inteiros', () => {
    expect(listaDeNomes(['Salmão', 'Alface'])).toBe('Salmão e Alface');
  });
});
