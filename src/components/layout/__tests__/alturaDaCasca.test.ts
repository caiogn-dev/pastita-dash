import { classeDeAltura } from '../alturaDaCasca';

/**
 * A casca do painel é uma APP SHELL: a janela não rola, o conteúdo rola por
 * dentro. Antes, só as rotas de tela cheia (inbox, KDS) eram assim, e a página
 * comum deixava a JANELA rolar — foi isso que quebrou a coluna de navegação.
 *
 * O defeito, medido no navegador em 06/09 na página de Fidelidade:
 *
 *   div.max-lg:hidden            4490px   ← flex item, esticava certo
 *     div.relative.shrink-0.w-64   695px   ← bloco comum: altura do CONTEÚDO
 *       nav.sticky.top-0.h-screen  695px
 *
 * `position: sticky` só gruda enquanto o PAI está em vista. O pai tinha 695px
 * (a altura da própria coluna), a página tinha 4490. Passados os primeiros
 * 695px de rolagem o pai terminava, e a navegação inteira subia junto com o
 * conteúdo e sumia — exatamente onde o operador precisa dela para sair da
 * página.
 *
 * Dava para remendar esticando o pai. A app shell resolve a causa: sem rolagem
 * de janela, a coluna não depende de `sticky` para ficar de pé, existe UMA
 * barra de rolagem (no conteúdo, onde ela pertence) e a barra de identidade do
 * topo também para de depender de sorte.
 */
describe('altura da casca', () => {
  it('toda rota prende a casca na viewport — a janela não rola', () => {
    expect(classeDeAltura(false)).toContain('h-[100dvh]');
    expect(classeDeAltura(true)).toContain('h-[100dvh]');
  });

  it('nada rola por fora da casca', () => {
    // É o que impede o conteúdo de empurrar a coluna de navegação para fora.
    expect(classeDeAltura(false)).toContain('overflow-hidden');
    expect(classeDeAltura(true)).toContain('overflow-hidden');
  });

  it('`min-h-screen` não volta — é ele que tira o teto de altura', () => {
    // Sem teto, `h-full` e `height: 100%` das camadas de baixo resolvem contra
    // um pai que cresce, e nenhum `overflow-hidden` mais abaixo adianta.
    expect(classeDeAltura(false)).not.toContain('min-h-screen');
    expect(classeDeAltura(true)).not.toContain('min-h-screen');
  });

  it('usa dvh e não vh — a barra do navegador no celular escondia o composer', () => {
    expect(classeDeAltura(false)).toContain('dvh');
    expect(classeDeAltura(false)).not.toContain('100vh');
  });
});
