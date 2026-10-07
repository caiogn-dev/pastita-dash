import { escolhasDoCombo, linhasDasEscolhas } from '../escolhasDoCombo';

describe('escolhasDoCombo', () => {
  it('um sabor por linha, repetidos somados, sem repetir o nome do grupo', () => {
    // Dono 07/10: "1x picadinho / 2x assadinho" dentro do COMBO 30 UNIDADES.
    const combo = {
      display_data: {
        groups: [{
          group_name: 'Escolha seus 30 pratos',
          items: [
            { product_name: 'Picadinho de Panela', quantity: 1 },
            { product_name: 'Assadinho', quantity: 1 },
            { product_name: 'Assadinho', quantity: 1 },
            { product_name: 'Escondidinho', quantity: 3 },
          ],
        }],
      },
    };
    expect(linhasDasEscolhas(combo)).toEqual([
      '1x Picadinho de Panela', '2x Assadinho', '3x Escondidinho',
    ]);
  });

  it('com vários grupos, o grupo vira cabeçalho', () => {
    const combo = {
      display_data: {
        groups: [
          { group_name: 'Escolha sua salada:', items: [{ product_name: 'Tilápia Suprema' }] },
          { group_name: 'Escolha seu suco:', items: [{ product_name: 'Acerola', quantity: 2 }] },
        ],
      },
    };
    expect(linhasDasEscolhas(combo)).toEqual([
      'Escolha sua salada:', '  1x Tilápia Suprema', 'Escolha seu suco:', '  2x Acerola',
    ]);
  });

  it('pedido antigo sem display_data usa selected_variants_data', () => {
    const combo = {
      selected_variants_data: [
        { group_name: 'Sabores', product_name: 'Assadinho' },
        { group_name: 'Sabores', product_name: 'Assadinho' },
        { group_name: 'Sabores', variant_name: 'Picadinho' },
      ],
    };
    expect(escolhasDoCombo(combo)).toEqual([
      { grupo: 'Sabores', escolhas: [{ quantidade: 2, nome: 'Assadinho' }, { quantidade: 1, nome: 'Picadinho' }] },
    ]);
  });

  it('sem combo ou sem escolhas: nada', () => {
    expect(linhasDasEscolhas(undefined)).toEqual([]);
    expect(linhasDasEscolhas({ display_data: { groups: [{ group_name: 'X', items: [] }] } })).toEqual([]);
  });
});
