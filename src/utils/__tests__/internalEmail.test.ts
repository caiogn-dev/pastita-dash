import { isInternalEmail, publicEmail } from '../internalEmail';

describe('isInternalEmail', () => {
  it.each([
    '99998280@local.invalid',
    'whatsapp_556399547790@whatsapp.bot',
    '556399990000@whatsapp.chat',
    '84016192@pastita.local',
    'x@whatsapp.local',
    'foo@qualquercoisa.invalid',
  ])('identifica %s como email interno', (email) => {
    expect(isInternalEmail(email)).toBe(true);
  });

  it.each(['maria@gmail.com', 'joao@empresa.com.br', 'a@b.co'])(
    'NÃO marca %s como interno',
    (email) => {
      expect(isInternalEmail(email)).toBe(false);
    },
  );

  it('trata vazio/undefined como não-interno', () => {
    expect(isInternalEmail(undefined)).toBe(false);
    expect(isInternalEmail('')).toBe(false);
  });
});

describe('publicEmail', () => {
  it('devolve o email quando é real', () => {
    expect(publicEmail('maria@gmail.com')).toBe('maria@gmail.com');
  });

  it('devolve undefined para email interno, vazio ou ausente', () => {
    expect(publicEmail('99998280@local.invalid')).toBeUndefined();
    expect(publicEmail('x@whatsapp.bot')).toBeUndefined();
    expect(publicEmail('')).toBeUndefined();
    expect(publicEmail(undefined)).toBeUndefined();
  });
});
