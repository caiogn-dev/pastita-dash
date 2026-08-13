/**
 * O painel e o backend têm que concordar sobre o que é comando.
 *
 * O risco que estes testes guardam: a dona digita `/pixx`, o sistema não
 * reconhece, e a CLIENTE recebe "/pixx" no WhatsApp. Erro de digitação virando
 * mensagem enviada é pior que comando que não executa.
 */
import { COMANDOS, interpretar, sugestoes } from '../comandos';

describe('quando é comando', () => {
  it('barra no começo é comando', () => {
    expect(interpretar('/pix')).not.toBeNull();
  });

  it('barra no meio é texto de gente', () => {
    expect(interpretar('nota 5/5 estrelas')).toBeNull();
    expect(interpretar('quero meio/meio')).toBeNull();
  });

  it('barra sozinha não vira comando', () => {
    expect(interpretar('/')).toBeNull();
  });
});

describe('comando desconhecido', () => {
  it('NUNCA é enviado ao cliente', () => {
    const c = interpretar('/pixx')!;
    expect(c.conhecido).toBe(false);
    expect(c.enviarAoCliente).toBe(false);
  });

  it('sugere o parecido', () => {
    expect(interpretar('/pixx')!.sugestao).toBe('pix');
    expect(interpretar('/cancela')!.sugestao).toBe('cancelar');
  });

  it('não inventa sugestão quando nada é parecido', () => {
    expect(interpretar('/zzzzzzzz')!.sugestao).toBeUndefined();
  });
});

describe('argumentos', () => {
  it('separa nome e argumento', () => {
    const c = interpretar('/cupom BEMVINDO10')!;
    expect(c.nome).toBe('cupom');
    expect(c.argumento).toBe('BEMVINDO10');
  });

  it('argumento com espaços fica inteiro', () => {
    expect(interpretar('/nota pediu sem cebola')!.argumento).toBe('pediu sem cebola');
  });
});

describe('segurança', () => {
  it('cancelar pede confirmação', () => {
    expect(interpretar('/cancelar')!.precisaConfirmar).toBe(true);
  });

  it('nenhum comando conhecido vai como texto ao cliente', () => {
    for (const c of COMANDOS) {
      expect(interpretar(`/${c.nome}`)!.enviarAoCliente).toBe(false);
    }
  });
});

describe('paleta', () => {
  it('barra sozinha lista tudo', () => {
    expect(sugestoes('/')).toHaveLength(COMANDOS.length);
  });

  it('filtra pelo que já foi digitado', () => {
    expect(sugestoes('/pi').map(c => c.nome)).toEqual(['pix']);
  });

  it('texto normal não abre paleta', () => {
    expect(sugestoes('oi tudo bem')).toEqual([]);
  });

  it('todo comando tem descrição — sem ela o atalho é adivinhação', () => {
    for (const c of COMANDOS) expect(c.descricao.length).toBeGreaterThan(0);
  });
});
