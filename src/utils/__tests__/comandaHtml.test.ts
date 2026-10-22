import { htmlDaComanda, layoutDaCozinha } from '../comandaHtml';
import type { LayoutDaComanda } from '../../services/printing';

const layout: LayoutDaComanda = {
  versao: 1,
  blocos: [
    { id: 'cabecalho', ligado: true }, { id: 'pagamento', ligado: true },
    { id: 'itens', ligado: true }, { id: 'totais', ligado: true },
  ],
  separador: 'tracejado', colunas: 48, vias: 2, itens_grandes: false,
  precos_nos_itens: true, mensagem: '',
};

describe('htmlDaComanda', () => {
  it('desenha as linhas do servidor, escapando o texto', () => {
    const html = htmlDaComanda([
      { texto: 'COBRAR   R$ 10,00', negrito: true, invertido: true },
      { texto: '<b>Ana</b>', alinhar: 'centro' },
    ], 48);
    expect(html).toContain('COBRAR   R$ 10,00');
    expect(html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(html).toContain('class="l inv b"');
    expect(html).toContain('text-align:center');
  });

  it('corte vira quebra de página, código de barras não vira lixo', () => {
    const html = htmlDaComanda([
      { texto: 'A' }, { texto: '', tipo: 'corte' }, { texto: 'CE-123', tipo: 'codigo_barras' },
    ], 48);
    expect(html).toContain('page-break-after');
    expect(html).not.toContain('>CE-123<');
  });
});

describe('layoutDaCozinha', () => {
  it('tira preço, totais e pagamento e imprime uma via', () => {
    const cozinha = layoutDaCozinha(layout);
    expect(cozinha.precos_nos_itens).toBe(false);
    expect(cozinha.vias).toBe(1);
    const ligados = cozinha.blocos.filter((b) => b.ligado).map((b) => b.id);
    expect(ligados).toEqual(['cabecalho', 'itens']);
    expect(layout.precos_nos_itens).toBe(true);
  });
});
