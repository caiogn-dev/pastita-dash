/**
 * ESPECIFICAÇÃO — como o painel escreve dinheiro.
 *
 * Havia DEZOITO formatadores de dinheiro privados espalhados por páginas e
 * componentes, mais DOIS `formatCurrency` exportados com o MESMO NOME de
 * arquivos diferentes (`utils/formatters` e `utils/dashboardValidators`).
 * Eles discordavam entre si em quatro pontos, e cada discordância é um jeito
 * de a tela mostrar um valor errado:
 *
 *  1. UNIDADE — uns devolvem "R$ 1.234,50"; outros devolvem "1.234,50" e
 *     esperam que o chamador escreva o "R$ " na frente. Trocar um pelo outro
 *     sem perceber produz "R$ R$ 1.234,50" ou um número sem moeda nenhuma.
 *
 *  2. CASAS DECIMAIS — sete deles passam `{ minimumFractionDigits: 2 }` SEM o
 *     `maximumFractionDigits`. O Intl então NÃO arredonda: R$ 1.234,567 sai
 *     com três casas. Dinheiro não tem três casas, e qualquer divisão (ticket
 *     médio, comissão de parceiro, rateio de frete) produz esse número.
 *
 *  3. VALOR AUSENTE — uns tratam null/undefined como zero, outros mandam
 *     direto para o Intl e a tela imprime "R$ NaN".
 *
 *  4. STRING — o backend serializa Decimal como string ("1234.57"). Uns
 *     convertem, outros não.
 *
 * E uma quinta decisão que não vinha de discordância, mas de descuido: o
 * `Intl` põe um espaço NÃO-QUEBRÁVEL (U+00A0) entre "R$" e o número. Ele é
 * invisível na tela e sobrevive à cópia — vai parar no CSV que o contador
 * abre, na mensagem que o dono cola no WhatsApp e na busca que o operador faz
 * por "R$ 50,00" e não encontra. Aqui ele vira espaço comum.
 *
 * Esta spec fixa as quatro decisões. É ela que a implementação tem que
 * satisfazer, não o contrário.
 */
import { formatCurrency, formatMoney } from '../formatters';

describe('spec: dinheiro no painel', () => {
  describe('unidade', () => {
    it('inclui o símbolo — quem chama NUNCA escreve "R$" à mão', () => {
      // Se a função devolvesse só o número, metade das telas escreveria o
      // "R$ " e a outra metade não. Era exatamente esse o estado anterior.
      expect(formatCurrency(1234.5)).toBe('R$ 1.234,50');
    });

    it('o espaço é COMUM, não o não-quebrável do Intl', () => {
      // U+00A0 é invisível e sobrevive à cópia: vai para o CSV do contador e
      // para a mensagem colada no WhatsApp, e faz a busca por "R$ 50,00"
      // dentro da página não encontrar nada.
      expect(formatCurrency(50)).not.toContain('\u00A0');
      expect(formatCurrency(50).split(' ')).toHaveLength(2);
    });

    it('`formatMoney` é o MESMO que `formatCurrency`, não um primo', () => {
      expect(formatMoney(9.9)).toBe(formatCurrency(9.9));
    });
  });

  describe('casas decimais', () => {
    it('arredonda para dois — dinheiro não tem terceira casa', () => {
      // A regressão que este teste impede: voltar a passar só
      // `minimumFractionDigits` e deixar o Intl imprimir 1.234,567.
      expect(formatCurrency(1234.567)).toBe('R$ 1.234,57');
    });

    it('arredonda para cima na metade, como se espera de dinheiro', () => {
      expect(formatCurrency(0.125)).toBe('R$ 0,13');
    });

    it('completa a segunda casa quando o valor é redondo', () => {
      expect(formatCurrency(50)).toBe('R$ 50,00');
    });
  });

  describe('valor ausente ou inválido', () => {
    it('null vira zero, não "R$ NaN"', () => {
      // "R$ NaN" na tela é pior que um zero: o dono liga achando que quebrou.
      expect(formatCurrency(null)).toBe('R$ 0,00');
    });

    it('undefined vira zero', () => {
      expect(formatCurrency(undefined)).toBe('R$ 0,00');
    });

    it('texto que não é número vira zero', () => {
      expect(formatCurrency('não é número')).toBe('R$ 0,00');
    });

    it('Infinity vira zero — nenhuma venda foi infinita', () => {
      expect(formatCurrency(Infinity)).toBe('R$ 0,00');
    });
  });

  describe('string do backend', () => {
    it('aceita a string do Decimal do Django', () => {
      // O DRF serializa DecimalField como string. Mandar isso direto para o
      // Intl funciona por acidente hoje, e é o tipo de acidente que some numa
      // atualização de runtime.
      expect(formatCurrency('1234.57')).toBe('R$ 1.234,57');
    });

    it('aceita string com vírgula decimal, que é o que o formulário devolve', () => {
      expect(formatCurrency('1234,57')).toBe('R$ 1.234,57');
    });
  });

  describe('negativo', () => {
    it('mantém o sinal — quebra de caixa e estorno existem', () => {
      expect(formatCurrency(-12.3)).toBe('-R$ 12,30');
    });
  });

  describe('sem símbolo, para quando ele já está na tela', () => {
    it('`semSimbolo` devolve só o número, com as mesmas regras', () => {
      // Existe um caso legítimo: a coluna "Total" com o "R$" no cabeçalho.
      // Ele é um MODO da função, não uma segunda função.
      expect(formatCurrency(1234.567, { semSimbolo: true })).toBe('1.234,57');
      expect(formatCurrency(null, { semSimbolo: true })).toBe('0,00');
    });
  });
});
