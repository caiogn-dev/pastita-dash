import { toCsv } from '../csv';

describe('toCsv', () => {
  it('gera CSV com cabeçalho e linhas', () => {
    const csv = toCsv(
      [
        { name: 'Salada', qty: 3, total: 90.5 },
        { name: 'Suco', qty: 1, total: 10 },
      ],
      [
        { key: 'name', label: 'Produto' },
        { key: 'qty', label: 'Qtd' },
        { key: 'total', label: 'Total' },
      ],
    );
    expect(csv).toBe('Produto;Qtd;Total\nSalada;3;90,5\nSuco;1;10');
  });

  it('escapa valores com ; aspas e quebra de linha', () => {
    const csv = toCsv(
      [{ name: 'A;B "C"\nD', qty: 1 }],
      [
        { key: 'name', label: 'Nome' },
        { key: 'qty', label: 'Qtd' },
      ],
    );
    expect(csv).toBe('Nome;Qtd\n"A;B ""C""\nD";1');
  });

  it('valores nulos/undefined viram vazio', () => {
    const csv = toCsv([{ a: null, b: undefined }], [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]);
    expect(csv).toBe('A;B\n;');
  });

  it('números usam vírgula decimal (pt-BR, abre direto no Excel)', () => {
    const csv = toCsv([{ v: 1234.56 }], [{ key: 'v', label: 'V' }]);
    expect(csv).toBe('V\n1234,56');
  });

  describe('neutraliza injeção de fórmula (CSV injection)', () => {
    it('prefixa aspa simples em texto que começa com =, +, - ou @', () => {
      const csv = toCsv(
        [
          { v: '=1+1' },
          { v: '+SUM(A1)' },
          { v: '-2+3' },
          { v: '@cmd' },
        ],
        [{ key: 'v', label: 'V' }],
      );
      expect(csv).toBe("V\n'=1+1\n'+SUM(A1)\n'-2+3\n'@cmd");
    });

    it('neutraliza fórmula com ; dentro (aspa fica dentro do campo entre aspas)', () => {
      const csv = toCsv(
        [{ v: '=HYPERLINK("http://evil";"x")' }],
        [{ key: 'v', label: 'V' }],
      );
      expect(csv).toBe('V\n"\'=HYPERLINK(""http://evil"";""x"")"');
    });

    it('neutraliza também tab e retorno de carro no início', () => {
      const csv = toCsv(
        [{ a: '\t=1', b: '\r=2' }],
        [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ],
      );
      expect(csv).toBe("A;B\n'\t=1;'\r=2");
    });

    it('NÃO neutraliza números negativos passados como number', () => {
      const csv = toCsv([{ v: -5 }], [{ key: 'v', label: 'V' }]);
      expect(csv).toBe('V\n-5');
    });

    it('não toca texto comum que não começa com caractere perigoso', () => {
      const csv = toCsv([{ v: 'Salada 2x=grande' }], [{ key: 'v', label: 'V' }]);
      expect(csv).toBe('V\nSalada 2x=grande');
    });
  });
});
