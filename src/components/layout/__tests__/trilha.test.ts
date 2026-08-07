/**
 * A trilha de navegação sai da MESMA árvore que desenha o menu.
 *
 * Se cada página escrever seu próprio breadcrumb à mão, no primeiro rename de
 * seção metade delas passa a mentir sobre onde o usuário está — e ninguém
 * percebe, porque breadcrumb errado não quebra build.
 *
 * `trilhaDoCaminho` deriva do array de seções. Uma definição, dois consumidores
 * (menu lateral e trilha). Renomear "Cardápio" para "Produtos" muda os dois.
 */
import { trilhaDoCaminho, buildNavSections } from '../navSections';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: false,
});

describe('trilhaDoCaminho', () => {
  it('item dentro de seção devolve seção + item', () => {
    const trilha = trilhaDoCaminho(sections, '/stores/minha-loja/link-bio');
    expect(trilha.map((t) => t.rotulo)).toEqual(['Cardápio', 'Link na Bio']);
  });

  it('o último elo não é clicável — é onde você está', () => {
    const trilha = trilhaDoCaminho(sections, '/stores/minha-loja/link-bio');
    expect(trilha[trilha.length - 1].href).toBeUndefined();
  });

  it('seção que é link direto devolve um elo só', () => {
    const trilha = trilhaDoCaminho(sections, '/stores/minha-loja/orders');
    expect(trilha.map((t) => t.rotulo)).toEqual(['Pedidos']);
  });

  it('caminho desconhecido devolve trilha vazia em vez de inventar', () => {
    // Melhor não mostrar trilha do que mostrar uma trilha falsa.
    expect(trilhaDoCaminho(sections, '/rota/que/nao/existe')).toEqual([]);
  });

  it('sub-rota de um item casa com o item pai', () => {
    // /orders/123 continua sendo "Pedidos" — o detalhe não é uma seção nova.
    const trilha = trilhaDoCaminho(sections, '/stores/minha-loja/orders/123');
    expect(trilha.map((t) => t.rotulo)).toEqual(['Pedidos']);
  });

  it('a raiz não gera trilha', () => {
    // Você já está em casa; a trilha seria "Início" apontando para si mesma.
    expect(trilhaDoCaminho(sections, '/')).toEqual([]);
  });
});
