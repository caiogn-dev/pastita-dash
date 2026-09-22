import {
  resumoDaConferencia,
  resumoDoResultado,
  podeImportar,
  MODELO_CSV,
} from '../planilhaDoCardapio';

describe('resumo da conferência', () => {
  it('diz quantos entram E quantos ficaram de fora', () => {
    // Esconder as falhas faz o dono importar achando que veio tudo.
    const t = resumoDaConferencia({
      validos: [{ nome: 'A', preco: '1', categoria: '' }, { nome: 'B', preco: '2', categoria: '' }],
      erros: [{ linha: 4, motivo: 'Falta o nome do produto.' }],
    });
    expect(t).toContain('2 produtos entram');
    expect(t).toContain('1 linha ficou de fora');
  });

  it('singular e plural em português de gente', () => {
    expect(resumoDaConferencia({ validos: [{ nome: 'A', preco: '1', categoria: '' }], erros: [] }))
      .toBe('1 produto entra no cardápio.');
  });

  it('planilha só com erros não finge que deu certo', () => {
    const t = resumoDaConferencia({ validos: [], erros: [{ linha: 2, motivo: 'x' }] });
    expect(t).toContain('Nenhum produto');
  });

  it('planilha vazia não é erro de sistema', () => {
    expect(resumoDaConferencia({ validos: [], erros: [] })).toBe('A planilha está vazia.');
  });
});

describe('pode importar', () => {
  it('sem item válido o botão não deve gravar nada', () => {
    expect(podeImportar({ validos: [], erros: [{ linha: 2, motivo: 'x' }] })).toBe(false);
    expect(podeImportar(null)).toBe(false);
    expect(podeImportar({ validos: [{ nome: 'A', preco: '1', categoria: '' }], erros: [] })).toBe(true);
  });
});

describe('resumo do resultado', () => {
  it('separa criado de atualizado', () => {
    // Quem subiu a planilha de novo para corrigir preço precisa ver que
    // ATUALIZOU, não que duplicou o cardápio.
    expect(resumoDoResultado({ criados: 0, atualizados: 3 })).toBe('3 atualizados.');
    expect(resumoDoResultado({ criados: 2, atualizados: 1 })).toBe('2 produtos novos e 1 atualizado.');
    expect(resumoDoResultado({ criados: 0, atualizados: 0 })).toBe('Nada foi alterado.');
  });
});

describe('modelo de planilha', () => {
  it('tem as colunas que o backend entende e um exemplo preenchido', () => {
    expect(MODELO_CSV).toContain('Nome');
    expect(MODELO_CSV).toContain('Preço');
    expect(MODELO_CSV).toContain('Categoria');
    expect(MODELO_CSV).toContain('32,90'); // preço no formato brasileiro
  });
});
