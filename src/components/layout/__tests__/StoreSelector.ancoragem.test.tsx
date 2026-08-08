/**
 * O menu de lojas abre PARA DENTRO da tela.
 *
 * O seletor mudou da ponta direita da barra para a esquerda, junto da
 * identidade da loja. O menu continuou com `right-0`: alinhado pela direita do
 * botão, ele cresce para a ESQUERDA — e, com o botão a 157px da borda, os 256px
 * de menu invadiam a faixa da coluna lateral, que pinta por cima.
 *
 * O resultado é o pior tipo de defeito de interface: o clique funciona, o menu
 * abre, e nada aparece.
 *
 * `left-0` ancora pela esquerda do botão e o menu cresce para o lado onde há
 * espaço — a área de conteúdo.
 */
import * as fs from 'fs';
import * as path from 'path';

const fonte = fs.readFileSync(
  path.join(__dirname, '..', 'StoreSelector.tsx'),
  'utf8'
);

describe('ancoragem do menu de lojas', () => {
  it('ancora à esquerda do botão, não à direita', () => {
    expect(fonte).toMatch(/className="[^"]*\bleft-0\b/);
    expect(fonte).not.toMatch(/className="[^"]*\bright-0\b/);
  });

  it('continua acima do conteúdo da página', () => {
    // O menu vive dentro do header (z-40). Perder o z-50 o coloca atrás dos
    // cards da própria home.
    expect(fonte).toMatch(/z-50/);
  });
});
