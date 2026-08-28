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

  describe('proteção contra CSV/formula injection', () => {
    // Uma célula de TEXTO controlada pelo cliente (nome, telefone, e-mail) que
    // começa com =, +, -, @, tab ou CR é executada como fórmula pelo Excel/
    // Sheets ao abrir o arquivo. Prefixamos "'" para forçar interpretação como
    // texto — OWASP CSV Injection.
    it.each(['=', '+', '-', '@'])(
      'prefixa "%s" com apóstrofo em célula de texto',
      (gatilho) => {
        const csv = toCsv(
          [{ nome: `${gatilho}CMD` }],
          [{ key: 'nome', label: 'Nome' }],
        );
        expect(csv).toBe(`Nome\n'${gatilho}CMD`);
      },
    );

    it('neutraliza fórmula clássica de exfiltração (=HYPERLINK)', () => {
      const csv = toCsv(
        [{ nome: '=HYPERLINK("http://evil.test","x")' }],
        [{ key: 'nome', label: 'Nome' }],
      );
      // começa com apóstrofo (não é mais fórmula) e é aspeado por conter ; " —
      // aqui não há ; mas há aspas, então vira célula aspeada.
      expect(csv).toBe(`Nome\n"'=HYPERLINK(""http://evil.test"",""x"")"`);
    });

    it('gatilho de tab no início também é neutralizado', () => {
      expect(toCsv([{ v: '\t=1+1' }], [{ key: 'v', label: 'V' }])).toBe("V\n'\t=1+1");
    });

    // Um CR "cru" fora de célula aspeada é separador de registro para vários
    // leitores: 'CR=1+1 viraria uma linha "'" seguida de uma linha "=1+1"
    // (fórmula executável), driblando o prefixo. Célula com CR precisa ser
    // aspeada — dentro das aspas o CR é dado literal, não separador.
    it('CR no início é prefixado E aspeado (não vira separador de registro)', () => {
      expect(toCsv([{ v: '\r=1+1' }], [{ key: 'v', label: 'V' }])).toBe('V\n"\'\r=1+1"');
    });

    it('CR no meio do valor força aspeamento (mesmo sem gatilho inicial)', () => {
      expect(toCsv([{ v: 'abc\r=1+1' }], [{ key: 'v', label: 'V' }])).toBe('V\n"abc\r=1+1"');
    });

    it('NÃO prefixa números negativos (mantém valor numérico no Excel)', () => {
      const csv = toCsv([{ v: -50.5 }], [{ key: 'v', label: 'V' }]);
      expect(csv).toBe('V\n-50,5');
    });

    it('texto comum (sem gatilho) permanece intacto', () => {
      const csv = toCsv([{ nome: 'Salada 2x1' }], [{ key: 'nome', label: 'Nome' }]);
      expect(csv).toBe('Nome\nSalada 2x1');
    });
  });
});
