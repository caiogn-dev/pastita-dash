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
});
