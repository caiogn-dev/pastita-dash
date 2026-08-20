import * as fs from 'fs';
import * as path from 'path';

/**
 * A coluna espiada tem que ficar ACIMA da navbar.
 *
 * Ambas declaravam `z-40`. Quando o z-index empata, quem pinta por cima é quem
 * vem DEPOIS no DOM — e no MainLayout a Navbar (linha 63) vem depois da Sidebar
 * (linha 60). Resultado: passar o mouse expandia a coluna e ela sumia atrás da
 * navbar, como se o hover não funcionasse. Só clicando a seta (que muda a
 * preferência e devolve o espaço no fluxo) a coluna aparecia inteira.
 *
 * Não basta olhar o z-index de um lado: o teste compara os dois, porque o
 * defeito é a RELAÇÃO entre eles.
 */
const layout = (arquivo: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', arquivo), 'utf8');

const zDe = (texto: string, marcador: RegExp): number => {
  const linha = texto.split('\n').find((l) => marcador.test(l));
  if (!linha) throw new Error(`não achei a linha de ${marcador}`);
  const m = linha.match(/z-(\d+)/);
  if (!m) throw new Error(`sem z-index em: ${linha.trim()}`);
  return Number(m[1]);
};

describe('camadas do shell', () => {
  const zSidebarEspiada = () => zDe(layout('Sidebar.tsx'), /espiada &&/);
  const zNavbar = () => zDe(layout('Navbar.tsx'), /sticky top-0 z-\d+ border-b/);

  it('a coluna espiada pinta ACIMA da navbar', () => {
    expect(zSidebarEspiada()).toBeGreaterThan(zNavbar());
  });

  it('empate não vale — quem vem depois no DOM ganharia', () => {
    expect(zSidebarEspiada()).not.toBe(zNavbar());
  });

  it('a coluna espiada mantém a sombra que a lê como camada de cima', () => {
    expect(layout('Sidebar.tsx')).toMatch(/espiada &&.*shadow-2xl/);
  });
});
