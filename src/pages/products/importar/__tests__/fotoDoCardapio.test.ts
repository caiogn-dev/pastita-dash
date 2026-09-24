import {
  problemaNaSelecao,
  rotuloDoErro,
  corpoDaConfirmacao,
  mensagemDeEspera,
  ACEITA_FOTO_OU_PDF,
  TEMPO_LIMITE_LEITURA_MS,
  MAX_PAGINAS,
} from '../fotoDoCardapio';
import { resumoDaConferencia } from '../planilhaDoCardapio';

const arq = (name: string, type: string) => ({ name, type });

describe('o que o lojista escolheu para subir', () => {
  it('várias fotos juntas são as páginas do cardápio', () => {
    expect(problemaNaSelecao([arq('p1.jpg', 'image/jpeg'), arq('p2.png', 'image/png')])).toBeNull();
  });

  it('um PDF sozinho serve', () => {
    expect(problemaNaSelecao([arq('menu.pdf', 'application/pdf')])).toBeNull();
  });

  it('PDF misturado com foto é recusado com o que fazer', () => {
    const p = problemaNaSelecao([arq('menu.pdf', 'application/pdf'), arq('p.jpg', 'image/jpeg')]);
    expect(p).toMatch(/PDF/);
  });

  it('planilha na aba de foto aponta para a aba certa', () => {
    const p = problemaNaSelecao([arq('cardapio.xlsx', '')]);
    expect(p?.toLowerCase()).toContain('planilha');
  });

  it(`mais de ${MAX_PAGINAS} páginas pede para dividir`, () => {
    const muitas = Array.from({ length: MAX_PAGINAS + 1 }, (_, i) => arq(`p${i}.jpg`, 'image/jpeg'));
    expect(problemaNaSelecao(muitas)).toContain(String(MAX_PAGINAS));
  });

  it('nada escolhido não é erro', () => {
    expect(problemaNaSelecao([])).toBeNull();
  });

  it('o seletor aceita imagem e PDF', () => {
    expect(ACEITA_FOTO_OU_PDF).toContain('image/');
    expect(ACEITA_FOTO_OU_PDF).toContain('pdf');
  });
});

describe('ler a foto demora mais que uma chamada comum', () => {
  it('o limite da leitura cobre o modelo (o padrão do painel é 15 s)', () => {
    expect(TEMPO_LIMITE_LEITURA_MS).toBeGreaterThanOrEqual(90_000);
  });

  it('a espera diz quanto tempo, por página', () => {
    expect(mensagemDeEspera(1)).toMatch(/segundos/);
    expect(mensagemDeEspera(3)).toContain('3 páginas');
  });
});

describe('conferência de foto fala de ITEM, não de linha', () => {
  it('erro aponta o item, porque foto não tem linha', () => {
    expect(rotuloDoErro('foto', 3)).toBe('Item 3');
    expect(rotuloDoErro('pdf', 1)).toBe('Item 1');
    expect(rotuloDoErro('planilha', 4)).toBe('Linha 4');
    expect(rotuloDoErro(undefined, 4)).toBe('Linha 4');
  });

  it('o resumo conta itens na foto', () => {
    const t = resumoDaConferencia({
      origem: 'foto',
      validos: [{ nome: 'A', preco: '1', categoria: '' }],
      erros: [{ linha: 2, motivo: 'Vinho: Informe o preço.' }],
    });
    expect(t).toContain('1 produto entra');
    expect(t).toContain('1 item ficou de fora');
  });

  it('foto sem nada lido não fala de planilha', () => {
    expect(resumoDaConferencia({ origem: 'foto', validos: [], erros: [] }))
      .toBe('Não encontrei produtos no cardápio enviado.');
  });
});

describe('confirmar grava o que foi CONFERIDO', () => {
  it('manda a tabela vista, não a foto de novo', () => {
    // Reenviar a foto chamaria o modelo outra vez: mais espera e uma leitura
    // que pode sair diferente da que o dono aprovou.
    const corpo = corpoDaConfirmacao({
      origem: 'foto',
      validos: [{ nome: 'Lasanha', preco: '42.50', categoria: 'Massas', descricao: 'molho branco' }],
      erros: [],
    });
    expect(corpo.confirmar).toBe(true);
    expect(corpo.linhas).toEqual([
      { nome: 'Lasanha', preco: '42.50', categoria: 'Massas', descricao: 'molho branco' },
    ]);
    expect(corpo).not.toHaveProperty('arquivo');
  });
});
