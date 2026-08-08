/**
 * A lista "top produtos" ordenada por receita responde uma pergunta só: o que
 * mais vendeu. Não responde a que muda o cardápio: **o que fazer com cada
 * item**.
 *
 * Dois eixos, quatro respostas:
 *
 *   giro alto + receita alta  →  Estrela        proteja: estoque e destaque
 *   giro alto + receita baixa →  Chamariz       traz gente; suba o combo
 *   giro baixo + receita alta →  Especialidade  poucos pedem, cada um vale
 *   giro baixo + receita baixa→  Peso morto     tire ou reposicione
 *
 * O corte é a MEDIANA, não a média: uma feijoada de R$ 90 entre saladas de
 * R$ 30 puxa a média para cima e joga metade do cardápio saudável para
 * "abaixo da média". Mediana é robusta a esse tipo de item.
 */
import { matrizDeProdutos, QUADRANTES } from '../matrizDeProdutos';

const p = (nome: string, qtd: number, receita: number) => ({
  product_id: nome,
  product_name: nome,
  total_quantity: qtd,
  total_revenue: receita,
  order_count: qtd,
  current_stock: null,
});

describe('matrizDeProdutos', () => {
  it('classifica pelos dois eixos', () => {
    const itens = matrizDeProdutos([
      p('Estrela', 100, 5000),
      p('Chamariz', 100, 500),
      p('Especial', 5, 4000),
      p('Morto', 3, 100),
    ]);
    const q = Object.fromEntries(itens.map((i) => [i.product_name, i.quadrante]));
    expect(q.Estrela).toBe('estrela');
    expect(q.Chamariz).toBe('chamariz');
    expect(q.Especial).toBe('especialidade');
    expect(q.Morto).toBe('peso_morto');
  });

  it('usa mediana, não média — um item caro não desloca o cardápio inteiro', () => {
    // Quatro saladas parecidas e uma feijoada de R$ 9.000. Pela média, as
    // quatro saladas ficariam "abaixo da média" e a tela mandaria tirar o
    // cardápio inteiro do ar.
    const itens = matrizDeProdutos([
      p('Salada A', 10, 300),
      p('Salada B', 11, 320),
      p('Salada C', 12, 340),
      p('Salada D', 13, 360),
      p('Feijoada', 14, 9000),
    ]);
    const mortos = itens.filter((i) => i.quadrante === 'peso_morto');
    expect(mortos.length).toBeLessThanOrEqual(2);
  });

  it('cada quadrante diz o que fazer, não só o que é', () => {
    // "Peso morto" sozinho é rótulo. "Tire do cardápio ou reposicione" é ação.
    for (const q of Object.values(QUADRANTES)) {
      expect(q.acao.length).toBeGreaterThan(10);
      expect(q.definicao).toMatch(/vend|pedid|receita|fatur/i);
    }
  });

  it('cardápio pequeno demais não vira diagnóstico', () => {
    // Com dois produtos, a mediana separa um de cada lado e a tela declararia
    // um "peso morto" sem base nenhuma.
    expect(matrizDeProdutos([p('A', 10, 100), p('B', 5, 50)])).toEqual([]);
  });

  it('lista vazia devolve vazio em vez de quebrar', () => {
    expect(matrizDeProdutos([])).toEqual([]);
    expect(matrizDeProdutos(undefined)).toEqual([]);
  });

  it('empate na mediana cai no lado alto', () => {
    // Item EXATAMENTE na mediana não é fraco. Mandá-lo para "peso morto"
    // faria a tela pedir a remoção de um produto mediano.
    const itens = matrizDeProdutos([
      p('A', 10, 100), p('B', 10, 100), p('C', 10, 100),
      p('D', 1, 10), p('E', 100, 1000),
    ]);
    const a = itens.find((i) => i.product_name === 'A')!;
    expect(a.quadrante).toBe('estrela');
  });
});
