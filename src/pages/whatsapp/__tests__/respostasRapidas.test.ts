import {
  aplicarVariaveis,
  atalhoDoEnter,
  filtrarRespostas,
  lerRespostasRapidas,
  normalizarAtalho,
  respostasPadrao,
  validarResposta,
} from '../respostasRapidas';

const LISTA = [
  { atalho: 'frete', texto: 'Oi {nome}, o frete depende do bairro.' },
  { atalho: 'pagamento', texto: 'Aceitamos PIX e cartão.' },
  { atalho: 'horario', texto: 'Horários em {cardapio}' },
  { atalho: 'menu', texto: 'Cardápio: {cardapio}' },
];

describe('lerRespostasRapidas', () => {
  it('sem nada gravado, vem com as 4 sugestões e avisa que são padrão', () => {
    const r = lerRespostasRapidas({});
    expect(r.padrao).toBe(true);
    expect(r.respostas.map((x) => x.atalho)).toEqual(['frete', 'pagamento', 'horario', 'menu']);
  });

  it('lista gravada (mesmo vazia) é respeitada — o lojista pode ter apagado tudo', () => {
    expect(lerRespostasRapidas({ respostas_rapidas: [] })).toEqual({ respostas: [], padrao: false });
    expect(lerRespostasRapidas({ respostas_rapidas: [LISTA[0]] }).respostas).toEqual([LISTA[0]]);
  });

  it('descarta entrada torta em vez de quebrar a tela', () => {
    const r = lerRespostasRapidas({ respostas_rapidas: [LISTA[1], { atalho: 3 }, null, 'x'] });
    expect(r.respostas).toEqual([LISTA[1]]);
  });

  it('metadata nulo não quebra', () => {
    expect(lerRespostasRapidas(null).padrao).toBe(true);
  });
});

describe('respostasPadrao', () => {
  it('nenhum atalho padrão colide com um comando do inbox (/pix e /cardapio já existem)', () => {
    for (const r of respostasPadrao()) {
      expect(validarResposta(r, [], -1)).toBeNull();
    }
  });
});

describe('filtrarRespostas', () => {
  it('só a barra lista todas', () => {
    expect(filtrarRespostas(LISTA, '/')).toHaveLength(4);
  });

  it('filtra enquanto digita, pelo começo do atalho', () => {
    expect(filtrarRespostas(LISTA, '/fr').map((r) => r.atalho)).toEqual(['frete']);
  });

  it('também acha pelo meio do atalho, depois dos que começam igual', () => {
    const lista = [{ atalho: 'taxa-frete', texto: 'a' }, { atalho: 'frete', texto: 'b' }];
    expect(filtrarRespostas(lista, '/fre').map((r) => r.atalho)).toEqual(['frete', 'taxa-frete']);
  });

  it('ignora acento e maiúscula', () => {
    expect(filtrarRespostas(LISTA, '/HORÁ').map((r) => r.atalho)).toEqual(['horario']);
  });

  it('texto normal ou com espaço depois do atalho não abre menu', () => {
    expect(filtrarRespostas(LISTA, 'bom dia')).toEqual([]);
    expect(filtrarRespostas(LISTA, '/frete agora')).toEqual([]);
  });
});

describe('aplicarVariaveis', () => {
  it('{nome} vira o primeiro nome do cliente', () => {
    expect(aplicarVariaveis('Oi {nome}!', { nome: 'Maria Souza' })).toBe('Oi Maria!');
  });

  it('sem nome, a variável some sem deixar espaço sobrando', () => {
    expect(aplicarVariaveis('Oi {nome}, tudo bem?', { nome: '' })).toBe('Oi, tudo bem?');
  });

  it('{cardapio} vira o link da loja', () => {
    expect(aplicarVariaveis('Veja: {cardapio}', { cardapio: 'https://x.com/loja' })).toBe('Veja: https://x.com/loja');
  });
});

describe('atalhoDoEnter', () => {
  it('Enter com "/fr" escolhe a primeira resposta que combina', () => {
    expect(atalhoDoEnter(LISTA, '/fr')?.atalho).toBe('frete');
  });

  it('comando digitado por inteiro continua sendo comando', () => {
    const lista = [...LISTA, { atalho: 'pixel', texto: 'x' }];
    expect(atalhoDoEnter(lista, '/pix')).toBeNull();
  });

  it('sem resposta combinando, o Enter segue o caminho de sempre', () => {
    expect(atalhoDoEnter(LISTA, '/zzz')).toBeNull();
    expect(atalhoDoEnter(LISTA, 'oi')).toBeNull();
  });
});

describe('normalizarAtalho e validarResposta', () => {
  it('atalho vira minúsculo, sem acento, sem barra e com hífen no lugar do espaço', () => {
    expect(normalizarAtalho('/Horário Domingo')).toBe('horario-domingo');
  });

  it('pede atalho e texto', () => {
    expect(validarResposta({ atalho: '', texto: 'x' }, LISTA, -1)).toMatch(/atalho/i);
    expect(validarResposta({ atalho: 'novo', texto: '  ' }, LISTA, -1)).toMatch(/texto/i);
  });

  it('não deixa repetir atalho, mas editar o próprio não conta como repetido', () => {
    expect(validarResposta({ atalho: 'frete', texto: 'x' }, LISTA, -1)).toMatch(/já existe/i);
    expect(validarResposta({ atalho: 'frete', texto: 'novo' }, LISTA, 0)).toBeNull();
  });

  it('não deixa usar o nome de um comando — /pix gera cobrança, não texto', () => {
    expect(validarResposta({ atalho: 'pix', texto: 'x' }, LISTA, -1)).toMatch(/comando/i);
  });
});
