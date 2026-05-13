import { getAvatarColor, getInitials } from '../avatar';

describe('getAvatarColor', () => {
  it('retorna sempre uma string hex válida', () => {
    const color = getAvatarColor('João');
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
  it('retorna a mesma cor para o mesmo nome', () => {
    expect(getAvatarColor('Maria')).toBe(getAvatarColor('Maria'));
  });
  it('funciona com string vazia', () => {
    const color = getAvatarColor('');
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('getInitials', () => {
  it('extrai iniciais de nome completo', () => {
    expect(getInitials('João Silva')).toBe('JS');
  });
  it('limita a 2 caracteres', () => {
    expect(getInitials('Ana Paula Costa')).toBe('AP');
  });
  it('usa últimos 2 dígitos do telefone como fallback', () => {
    expect(getInitials(undefined, '11999990042')).toBe('42');
  });
  it('retorna ? quando sem nome e sem telefone', () => {
    expect(getInitials()).toBe('?');
  });
});
