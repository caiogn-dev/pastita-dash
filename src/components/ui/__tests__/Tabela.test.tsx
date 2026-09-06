/**
 * Vinte páginas escrevem a MESMA tabela à mão.
 *
 * O dono: "NADA ESTA COMPONENTIZADO... TUDO SE REPLICA PRATICAMENTE, VOCE NAO
 * PERCEBE..?". Ele está certo, e o número é esse: 20 arquivos com `<thead>`
 * próprio, cada um com o seu padding, a sua cor de cabeçalho, o seu jeito de
 * dizer "nenhum resultado" e a sua linha clicável (quando tem).
 *
 * Existia um `organisms/DataTable` — e NENHUMA página o usava. O motivo está
 * no fonte dele: ele pinta `zinc-50`, `zinc-900`, `zinc-100` diretamente, em
 * vez dos tokens do tema. Num painel que é carvão e ouro, ele entrava como um
 * retângulo cinza de outro produto. Componente que não combina com o tema não
 * é reaproveitado: é contornado. Ele sai junto com este arquivo.
 *
 * Duas coisas que esta tabela faz e a antiga não fazia, e que são a razão de
 * as páginas duplicarem:
 *
 *  - No CELULAR ela vira cartões, a partir da MESMA definição de coluna.
 *    Cupons e Zonas de entrega escreviam a lista DUAS VEZES — cartões no
 *    celular, tabela no desktop — e as duas versões já divergiam.
 *  - O vazio e a paginação são dela, e usam o `EmptyState` e o `Paginacao`
 *    que já existem, em vez de um texto solto centralizado.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

import { Tabela } from '../Tabela';

interface Cupom {
  id: string;
  code: string;
  valor: string;
}

const CUPONS: Cupom[] = [
  { id: '1', code: 'BEMVINDO10', valor: '10%' },
  { id: '2', code: 'INDICA10', valor: '10%' },
];

const COLUNAS = [
  { chave: 'code', cabecalho: 'Código', render: (c: Cupom) => c.code },
  { chave: 'valor', cabecalho: 'Desconto', render: (c: Cupom) => c.valor },
];

const montar = (props: Partial<React.ComponentProps<typeof Tabela<Cupom>>> = {}) =>
  render(
    <Tabela<Cupom>
      itens={CUPONS}
      colunas={COLUNAS}
      chave={(c) => c.id}
      rotuloDaLinha={(c) => `Abrir cupom ${c.code}`}
      {...props}
    />,
  );

describe('tabela do painel', () => {
  it('desenha cabeçalho e linhas a partir das colunas', () => {
    montar();

    expect(screen.getByRole('columnheader', { name: 'Código' })).toBeInTheDocument();
    expect(screen.getAllByText('BEMVINDO10').length).toBeGreaterThan(0);
  });

  it('no celular, os MESMOS dados viram cartões — sem segunda escrita', () => {
    // É isto que mata a duplicação: Cupons e Zonas mantinham duas listas.
    const { container } = montar();

    const cartoes = container.querySelector('[data-testid="tabela-cartoes"]');
    expect(cartoes).toBeInTheDocument();
    expect(within(cartoes as HTMLElement).getByText('BEMVINDO10')).toBeInTheDocument();
    // O cartão rotula cada valor, senão vira uma pilha de texto sem sentido.
    expect(within(cartoes as HTMLElement).getAllByText('Desconto').length).toBe(2);
  });

  it('a linha abre o item, por clique e por teclado', () => {
    const onAbrir = jest.fn();
    montar({ onAbrir });

    const linha = screen.getByRole('row', { name: 'Abrir cupom BEMVINDO10' });
    fireEvent.click(linha);
    expect(onAbrir).toHaveBeenCalledWith(CUPONS[0]);

    fireEvent.keyDown(linha, { key: 'Enter' });
    expect(onAbrir).toHaveBeenCalledTimes(2);
  });

  it('sem onAbrir a linha não finge ser clicável', () => {
    montar();

    expect(screen.getByRole('row', { name: 'Abrir cupom BEMVINDO10' })).not.toHaveAttribute(
      'tabindex',
    );
  });

  it('lista vazia usa o EmptyState do painel, com a ação de criar', () => {
    montar({
      itens: [],
      vazio: { titulo: 'Nenhum cupom ainda', acao: <button type="button">Novo cupom</button> },
    });

    expect(screen.getByText('Nenhum cupom ainda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo cupom' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('carregando não mostra "nenhum resultado" — isso é mentira sobre o dado', () => {
    // Piscar o vazio antes da resposta chegar faz o dono acreditar que a loja
    // não tem cupom nenhum.
    montar({ itens: [], carregando: true, vazio: { titulo: 'Nenhum cupom ainda' } });

    expect(screen.queryByText('Nenhum cupom ainda')).toBeNull();
  });

  it('a paginação é a mesma do resto do painel', () => {
    montar({ paginacao: { pagina: 1, porPagina: 20, total: 35, onPagina: jest.fn() } });

    expect(screen.getByText(/1–20 de 35/)).toBeInTheDocument();
  });

  it('a classe da coluna vale no cabeçalho E na célula', () => {
    // Sem isso, esconder uma coluna no tablet significa repetir a classe em
    // dois lugares — e foi assim que Clientes acabou com o cabeçalho "Gasto
    // total" visível numa faixa em que a célula já tinha sumido.
    render(
      <Tabela<Cupom>
        itens={CUPONS}
        colunas={[{ chave: 'valor', cabecalho: 'Desconto', classe: 'max-lg:hidden', render: (c) => c.valor }]}
        chave={(c) => c.id}
        rotuloDaLinha={(c) => c.code}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Desconto' }).className).toMatch(/max-lg:hidden/);
    expect(screen.getAllByRole('cell')[0].className).toMatch(/max-lg:hidden/);
  });

  it('coluna pode declarar que some no celular', () => {
    // Nem toda coluna cabe num cartão; "criado em" é ruído no telefone.
    const { container } = render(
      <Tabela<Cupom>
        itens={CUPONS}
        colunas={[...COLUNAS, { chave: 'x', cabecalho: 'Criado em', soNoDesktop: true, render: () => 'ontem' }]}
        chave={(c) => c.id}
        rotuloDaLinha={(c) => c.code}
      />,
    );

    const cartoes = container.querySelector('[data-testid="tabela-cartoes"]') as HTMLElement;
    expect(within(cartoes).queryByText('Criado em')).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Criado em' })).toBeInTheDocument();
  });
});
