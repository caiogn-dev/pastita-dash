import { mapaDeCategorias } from '../categoriasDeIngrediente';

describe('categorias de ingrediente', () => {
  it('junta "a base" e "à base"', () => {
    const m = mapaDeCategorias(['À base de plantas', 'À base de plantas', 'a base de plantas']);
    expect(new Set(Object.values(m)).size).toBe(1);
    expect(m['a base de plantas']).toBe('À base de plantas');
  });
  it('corrige typo de uma letra pela mais usada', () => {
    const m = mapaDeCategorias(['Alho', 'Alho', 'Alho', 'allho']);
    expect(m['allho']).toBe('Alho');
  });
  it('esconde inglês e espanhol', () => {
    const m = mapaDeCategorias(['plant based foods', 'productos lacteos', 'Cereais e derivados']);
    expect(m['plant based foods']).toBe('');
    expect(m['productos lacteos']).toBe('');
    expect(m['Cereais e derivados']).toBe('Cereais e derivados');
  });
  it('não funde palavras curtas diferentes', () => {
    const m = mapaDeCategorias(['Uva', 'Uma']);
    expect(m['Uva']).toBe('Uva');
  });
});
