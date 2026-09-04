/**
 * Casar o cliente do cadastro com o cliente do relatório RFM.
 *
 * A junção é pelo TELEFONE, e é aí que este projeto já se queimou várias
 * vezes: o mesmo número aparece em formatos diferentes conforme a porta de
 * entrada. O `wa_id` do WhatsApp vem sem o nono dígito, o checkout grava com
 * ele, o painel formata com parênteses e traço, e alguns registros têm o 55 e
 * outros não.
 *
 * Comparar string crua faz a ficha do cliente ficar sem segmento justamente
 * para quem mais interessa — o recorrente, que veio por vários canais.
 *
 * A regra: compara os ÚLTIMOS 8 dígitos. É o que sobra depois de tirar DDI,
 * DDD e o nono dígito, e é o suficiente para não colidir dentro de uma loja.
 */
import { segmentoPorTelefone } from '../segmentoDoCliente';

const RELATORIO = [
  { phone: '5563992618115', segment: 'em_risco' },
  { phone: '63984143551', segment: 'campeoes' },
];

describe('segmento do cliente por telefone', () => {
  it('casa quando os dois lados estão iguais', () => {
    expect(segmentoPorTelefone(RELATORIO, '5563992618115')).toBe('em_risco');
  });

  it('casa com e sem o DDI 55', () => {
    expect(segmentoPorTelefone(RELATORIO, '63992618115')).toBe('em_risco');
    expect(segmentoPorTelefone(RELATORIO, '5563984143551')).toBe('campeoes');
  });

  it('casa com o número formatado do painel', () => {
    expect(segmentoPorTelefone(RELATORIO, '(63) 99261-8115')).toBe('em_risco');
  });

  it('casa mesmo sem o nono dígito, como vem do wa_id', () => {
    // 5563 9926-1811 5 → sem o nono: 556392618115
    expect(segmentoPorTelefone(RELATORIO, '556392618115')).toBe('em_risco');
  });

  it('devolve nulo para quem não está no relatório', () => {
    expect(segmentoPorTelefone(RELATORIO, '11999999999')).toBeNull();
  });

  it('não inventa segmento para telefone vazio ou curto', () => {
    // Sem isto, um cadastro sem telefone casaria com o primeiro da lista e a
    // ficha mostraria "Campeão" para quem nunca comprou.
    expect(segmentoPorTelefone(RELATORIO, '')).toBeNull();
    expect(segmentoPorTelefone(RELATORIO, '123')).toBeNull();
  });

  it('relatório vazio não quebra a ficha', () => {
    expect(segmentoPorTelefone([], '5563992618115')).toBeNull();
  });
});
