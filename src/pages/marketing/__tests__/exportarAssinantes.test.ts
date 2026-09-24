import {
  assinantesParaCsv,
  lerContatosCsv,
  type AssinanteExportavel,
} from '../exportarAssinantes';

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

describe('lerContatosCsv (inverso — ida-e-volta com a exportação)', () => {
  it('mantém paste simples separado por vírgula (comportamento antigo)', () => {
    const contatos = lerContatosCsv('joao@x.com, João, 11999\nana@y.com, Ana');
    expect(contatos).toEqual([
      { email: 'joao@x.com', name: 'João', phone: '11999' },
      { email: 'ana@y.com', name: 'Ana', phone: '' },
    ]);
  });

  it('descarta o cabeçalho e as linhas sem e-mail válido', () => {
    const contatos = lerContatosCsv('email,name,phone,status\nsó-texto\nx@y.com,Ana,1,active');
    expect(contatos).toEqual([{ email: 'x@y.com', name: 'Ana', phone: '1' }]);
  });

  it('decodifica campo aspeado com vírgula interna', () => {
    const contatos = lerContatosCsv('m@x.com,"Silva, Maria",119,active');
    expect(contatos[0]).toEqual({ email: 'm@x.com', name: 'Silva, Maria', phone: '119' });
  });

  it('decodifica aspas internas ("" -> ")', () => {
    const contatos = lerContatosCsv('z@x.com,"Ze ""Boca""",1,active');
    expect(contatos[0].name).toBe('Ze "Boca"');
  });

  it('desfaz a guarda de fórmula só quando ela foi posta pela exportação', () => {
    const contatos = lerContatosCsv("'+5511999@x.com,'=nome,'@arroba,active");
    expect(contatos[0]).toEqual({ email: '+5511999@x.com', name: '=nome', phone: '@arroba' });
  });

  it('ida-e-volta: exportar e reimportar preserva email/nome/telefone', () => {
    const origem: AssinanteExportavel[] = [
      { email: 'm@x.com', name: 'Silva, Maria', phone: '+5511', status: 'active' },
      { email: 'z@x.com', name: 'Ze "Boca"', phone: '', status: 'unsubscribed' },
      { email: 'f@x.com', name: '=HYPERLINK("a","b")', phone: '119', status: 'active' },
    ];
    const voltaram = lerContatosCsv(assinantesParaCsv(origem));
    expect(voltaram).toEqual(
      origem.map(({ email, name, phone }) => ({ email, name, phone })),
    );
  });
});
