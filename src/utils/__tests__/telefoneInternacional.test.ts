/**
 * O painel decidia o país pelo TAMANHO do número — e errava.
 *
 * `formatPhoneForWhatsApp` grudava '55' em qualquer número de até 11 dígitos.
 * O celular da Layane (Espanha, `34647520824`) tem exatamente 11, então o
 * botão de WhatsApp do painel abria conversa com `5534647520824` — um número
 * que não existe. E `formatPhone` exibia o mesmo número como `(34) 64752-0824`,
 * fingindo ser um DDD de Uberlândia.
 *
 * O que separa: celular BR de 11 dígitos tem 9 na terceira posição
 * (DDD + 9XXXXXXXX); fixo de 10 começa entre 2 e 5.
 */
import { formatPhone, formatPhoneForWhatsApp } from '../formatters';

const ESPANHA = '34647520824';       // Layane
const BR_CELULAR = '63992429380';
const BR_E164 = '5563992429380';

describe('formatPhoneForWhatsApp', () => {
  it('não inventa DDI 55 para número estrangeiro', () => {
    expect(formatPhoneForWhatsApp(ESPANHA)).toBe(ESPANHA);
    expect(formatPhoneForWhatsApp('+34 647 52 08 24')).toBe(ESPANHA);
  });

  it('continua completando o DDI do brasileiro', () => {
    expect(formatPhoneForWhatsApp(BR_CELULAR)).toBe(BR_E164);
    expect(formatPhoneForWhatsApp('(63) 99242-9380')).toBe(BR_E164);
    expect(formatPhoneForWhatsApp('6332151234')).toBe('556332151234');
  });

  it('não duplica DDI já presente', () => {
    expect(formatPhoneForWhatsApp(BR_E164)).toBe(BR_E164);
  });
});

describe('formatPhone', () => {
  it('brasileiro mantém a exibição de sempre', () => {
    expect(formatPhone(BR_E164)).toBe('+55 (63) 99242-9380');
    expect(formatPhone(BR_CELULAR)).toBe('(63) 99242-9380');
    expect(formatPhone('6332151234')).toBe('(63) 3215-1234');
  });

  it('estrangeiro não é exibido como DDD brasileiro', () => {
    const exibido = formatPhone(ESPANHA);
    expect(exibido).not.toContain('(34)');
    // Sem uma tabela de DDI o painel não sabe onde o país termina (34 = 2
    // dígitos, 351 = 3, 1 = 1). Agrupar no lugar errado é pior que não
    // agrupar: o E.164 puro é lido sem ambiguidade.
    expect(exibido).toBe('+34647520824');
  });
});
