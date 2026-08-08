/**
 * O que a home diz sobre as avaliações.
 *
 * Em 08/ago/2026 a Cê Saladas tinha 4 avaliações com média 5,0 e o dono não
 * via nenhuma: o endpoint existia (`reports/reviews`), a aba de relatório
 * existia, e a home — a tela que ele abre todo dia — não mencionava o assunto.
 *
 * Uma nota média sozinha também não basta. "4,6" não diz o que consertar, e
 * com 4 avaliações não diz nem se é sorte. O card precisa dizer QUANTAS notas
 * sustentam a média e o que fazer a respeito.
 */
import { leituraDeAvaliacoes } from '../leituraDeAvaliacoes';

const resumo = (over: Record<string, unknown> = {}) => ({
  summary: { avg_rating: 4.8, count: 20 },
  distribution: [
    { rating: 5, count: 16 },
    { rating: 4, count: 3 },
    { rating: 1, count: 1 },
  ],
  recent: [],
  by_product: [],
  ...over,
}) as never;

describe('leituraDeAvaliacoes', () => {
  it('sem nenhuma avaliação, convida a pedir a primeira', () => {
    const l = leituraDeAvaliacoes(resumo({ summary: { avg_rating: null, count: 0 }, distribution: [] }));
    expect(l.vazio).toBe(true);
    expect(l.recomendacao).toMatch(/peç|convid|primeira/i);
    // "0,0 estrelas" seria uma nota péssima inventada por falta de dado.
    expect(l.nota).toBeNull();
  });

  it('amostra pequena avisa que a média ainda não significa nada', () => {
    // Média 5,0 com 4 avaliações não é "loja nota 5": é pouca gente.
    const l = leituraDeAvaliacoes(resumo({ summary: { avg_rating: 5, count: 4 }, distribution: [{ rating: 5, count: 4 }] }));
    expect(l.confiavel).toBe(false);
    expect(l.contexto).toMatch(/poucas|ainda/i);
  });

  it('com volume, a média vale e o texto muda', () => {
    const l = leituraDeAvaliacoes(resumo());
    expect(l.confiavel).toBe(true);
    expect(l.nota).toBe('4,8');
  });

  it('nota baixa aponta para as notas ruins, não para a média', () => {
    // "3,2 de média" não diz o que fazer. "4 pessoas deram 1 ou 2 estrelas —
    // leia os comentários" diz.
    const l = leituraDeAvaliacoes(resumo({
      summary: { avg_rating: 3.2, count: 20 },
      distribution: [{ rating: 5, count: 8 }, { rating: 2, count: 6 }, { rating: 1, count: 6 }],
    }));
    expect(l.insatisfeitos).toBe(12);
    expect(l.recomendacao).toMatch(/coment|ler|entender/i);
  });

  it('conta como insatisfeito quem deu 1 ou 2 — não o 3', () => {
    // 3 estrelas é morno, não revolta. Somar o 3 inflaria o alarme e
    // ensinaria a ignorar o número.
    const l = leituraDeAvaliacoes(resumo({
      summary: { avg_rating: 4, count: 20 },
      distribution: [{ rating: 5, count: 10 }, { rating: 3, count: 8 }, { rating: 1, count: 2 }],
    }));
    expect(l.insatisfeitos).toBe(2);
  });

  it('vírgula decimal — aqui não se escreve 4.8', () => {
    expect(leituraDeAvaliacoes(resumo()).nota).toBe('4,8');
  });

  it('resposta torta do servidor não quebra a home', () => {
    expect(leituraDeAvaliacoes(undefined).vazio).toBe(true);
    expect(leituraDeAvaliacoes({} as never).vazio).toBe(true);
  });
});
