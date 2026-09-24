import { assinantesParaCsv, type AssinanteExportavel } from '../exportarAssinantes';

const assinante = (over: Partial<AssinanteExportavel>): AssinanteExportavel => ({
  email: 'a@b.com',
  name: 'Fulano',
  phone: '',
  status: 'active',
  ...over,
});

describe('assinantesParaCsv', () => {
  it('abre com o cabeçalho em inglês separado por vírgula (ida-e-volta com a importação)', () => {
    const csv = assinantesParaCsv([]);
    expect(csv).toBe('email,name,phone,status');
  });

  it('exporta uma linha por assinante na ordem email,name,phone,status', () => {
    const csv = assinantesParaCsv([
      assinante({ email: 'joao@x.com', name: 'João', phone: '11988887777', status: 'active' }),
    ]);
    expect(csv.split('\n')[1]).toBe('joao@x.com,João,11988887777,active');
  });

  it('neutraliza fórmula em célula de texto vinda do cliente (OWASP CSV injection)', () => {
    const csv = assinantesParaCsv([
      assinante({ name: '=HYPERLINK("http://mal","clique")' }),
    ]);
    const linha = csv.split('\n')[1];
    // O nome tem vírgula E gatilho de fórmula: prefixo "'" + aspeamento.
    expect(linha).toContain(`"'=HYPERLINK(""http://mal"",""clique"")"`);
    // Nunca sai uma célula começando com "=" crua.
    expect(linha).not.toContain(',=HYPERLINK');
  });

  it('neutraliza gatilhos +, -, @ no início do valor', () => {
    const csv = assinantesParaCsv([
      assinante({ name: '@arroba', phone: '+5511999', email: '-menos@x.com', status: 'active' }),
    ]);
    const linha = csv.split('\n')[1];
    expect(linha).toBe("'-menos@x.com,'@arroba,'+5511999,active");
  });

  it('aspeia nome com vírgula para não deslocar as colunas seguintes', () => {
    const csv = assinantesParaCsv([
      assinante({ email: 'm@x.com', name: 'Silva, Maria', phone: '119', status: 'active' }),
    ]);
    expect(csv.split('\n')[1]).toBe('m@x.com,"Silva, Maria",119,active');
  });

  it('duplica aspas internas e aspeia a célula', () => {
    const csv = assinantesParaCsv([assinante({ name: 'Ze "Boca"' })]);
    expect(csv.split('\n')[1]).toContain('"Ze ""Boca"""');
  });

  it('aspeia CR/LF embutido para não abrir uma nova linha executável', () => {
    const csv = assinantesParaCsv([assinante({ name: 'linha1\r=cmd' })]);
    const corpo = csv.slice('email,name,phone,status\n'.length);
    // Todo o valor vira uma única célula aspeada; o CR fica preso dentro dela.
    expect(corpo).toContain('"linha1\r=cmd"');
    // Não pode existir uma linha começando com "=cmd".
    expect(corpo.split('\n').some((l) => l.startsWith('=cmd'))).toBe(false);
  });

  it('telefone ausente vira célula vazia sem quebrar as colunas', () => {
    const csv = assinantesParaCsv([
      assinante({ email: 'x@y.com', name: 'Ana', phone: undefined, status: 'unsubscribed' }),
    ]);
    expect(csv.split('\n')[1]).toBe('x@y.com,Ana,,unsubscribed');
  });
});
