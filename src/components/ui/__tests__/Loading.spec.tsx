/**
 * ESPECIFICAÇÃO — a espera do painel.
 *
 * Vinte e oito arquivos desenhavam o próprio spinner, em quatorze variações de
 * classe. Existia um `Loading` comum, e ele tinha três defeitos que explicam
 * por que ninguém usava:
 *
 *  1. COR ERRADA. `border-primary-500` é o terracota do storefront (#C7492E),
 *     não o ouro da marca do painel. Pior: num tenant, `--primary-500` é a cor
 *     DA LOJA — o spinner do painel mudava de cor conforme a loja selecionada.
 *     As versões à mão usavam `border-brand`, que é o certo. Elas foram
 *     escritas porque a comum parecia de outro produto.
 *
 *  2. FORMA DIFERENTE. O comum usava `border-b-2`: um traço fino embaixo. As
 *     versões à mão usam `border-4 ... border-t-transparent`, o anel cheio com
 *     um vão. Quem trocasse via a espera mudar de desenho.
 *
 *  3. MUDO. Nenhum tinha `role="status"`. Para quem usa leitor de tela, a
 *     página simplesmente emudece: nada anuncia que há algo carregando, e
 *     nada anuncia quando termina. Um spinner é uma animação — sem papel, é
 *     decoração invisível.
 *
 * Esta spec fixa os três.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import { Loading, PageLoading } from '../../common/Loading';

describe('spec: espera do painel', () => {
  describe('anúncio', () => {
    it('tem papel de status — a página não emudece', () => {
      render(<Loading />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('diz o que está acontecendo, com texto próprio quando informado', () => {
      // `role="status"` é REGIÃO VIVA: o leitor de tela lê o CONTEÚDO quando
      // ele aparece. Não é nome acessível — pedir `toHaveAccessibleName` aqui
      // testaria a coisa errada.
      render(<Loading rotulo="Carregando pedidos" />);

      expect(screen.getByRole('status')).toHaveTextContent('Carregando pedidos');
    });

    it('sem rótulo próprio, ainda diz "Carregando"', () => {
      render(<Loading />);

      expect(screen.getByRole('status')).toHaveTextContent(/carregando/i);
    });

    it('o texto do rótulo NÃO ocupa espaço na tela', () => {
      // Ele existe para o leitor de tela; desenhá-lo empurraria o layout.
      render(<Loading rotulo="Carregando pedidos" />);

      expect(screen.getByText('Carregando pedidos')).toHaveClass('sr-only');
    });
  });

  describe('aparência', () => {
    it('gira na cor da MARCA, não no terracota do storefront', () => {
      const { container } = render(<Loading />);

      const anel = container.querySelector('[aria-hidden]') as HTMLElement;
      expect(anel.className).toMatch(/border-brand/);
      expect(anel.className).not.toMatch(/primary-500/);
    });

    it('é o anel cheio com um vão, a mesma forma das versões à mão', () => {
      const { container } = render(<Loading />);

      const anel = container.querySelector('[aria-hidden]') as HTMLElement;
      expect(anel.className).toMatch(/border-t-transparent/);
      expect(anel.className).not.toMatch(/border-b-2\b/);
    });

    it('aceita os três tamanhos que as telas realmente usam', () => {
      const { container: p } = render(<Loading size="sm" />);
      const { container: g } = render(<Loading size="lg" />);

      expect((p.querySelector('[aria-hidden]') as HTMLElement).className).toMatch(/h-4/);
      expect((g.querySelector('[aria-hidden]') as HTMLElement).className).toMatch(/h-12/);
    });
  });

  describe('espera de página inteira', () => {
    it('anuncia uma vez só — não um status dentro do outro', () => {
      // `PageLoading` embrulha `Loading`. Dois `role="status"` aninhados fazem
      // o leitor de tela anunciar a mesma espera duas vezes.
      render(<PageLoading />);

      expect(screen.getAllByRole('status')).toHaveLength(1);
    });

    it('o texto visível "Carregando…" usa token, não cinza cru', () => {
      // `text-gray-500 dark:text-zinc-400` era o par cru: no claro dava um
      // cinza que não é o do painel, e o escuro consertava por fora.
      render(<PageLoading />);

      const visivel = screen.getByText(/carregando/i, { selector: 'p' });
      expect(visivel.className).toMatch(/text-fg-muted-token/);
      expect(visivel.className).not.toMatch(/text-(gray|zinc)-\d/);
    });
  });
});
