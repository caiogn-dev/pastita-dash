/**
 * O chassi também serve para QUADRO DE TRABALHO, não só para documento.
 *
 * Pedidos, KDS e PDV não são páginas que se lê de cima para baixo: são
 * superfícies que o dono deixa abertas o dia inteiro. Elas ficaram de fora da
 * padronização justamente porque o cabeçalho de documento — título grande,
 * descrição, espaçamento largo — comeria a altura do quadro, que é o que
 * importa quando o restaurante está cheio.
 *
 * Cada uma resolveu isso do seu jeito: Pedidos tem um título minúsculo em
 * caixa alta com `tracking-[0.24em]`, que não se parece com nenhum outro
 * título do painel. O resultado é o mesmo problema por outro caminho — quem
 * navega vê produtos diferentes.
 *
 * A variante `quadro` mantém a IDENTIDADE (mesmo título, mesma trilha, ações
 * no mesmo canto) e muda só a DENSIDADE: título menor, sem descrição, e o
 * conteúdo ocupando a altura que sobra.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { PageShell } from '../PageShell';

const montar = (props: Partial<React.ComponentProps<typeof PageShell>> = {}) =>
  render(
    <MemoryRouter>
      <PageShell titulo="Pedidos" {...props}>
        <div data-testid="conteudo">o quadro</div>
      </PageShell>
    </MemoryRouter>,
  );

describe('chassi em modo quadro', () => {
  it('mantém o título — é o que diz que é a mesma família de telas', () => {
    montar({ variante: 'quadro' });

    expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
  });

  it('mantém a trilha: quem abre o quadro por link direto também se perde', () => {
    montar({
      variante: 'quadro',
      trilha: [{ rotulo: 'Cê Saladas', href: '/stores/ce-saladas' }, { rotulo: 'Pedidos' }],
    });

    expect(screen.getByLabelText(/trilha/i)).toBeInTheDocument();
  });

  it('mantém as ações no mesmo canto de sempre', () => {
    montar({ variante: 'quadro', acoes: <button type="button">Novo pedido</button> });

    expect(screen.getByRole('button', { name: 'Novo pedido' })).toBeInTheDocument();
  });

  it('NÃO mostra a descrição — num quadro ela é altura perdida', () => {
    // Quem trabalha aqui já sabe o que a tela faz; a frase explicativa só
    // empurra as colunas para baixo, e é a coluna que precisa de espaço.
    montar({ variante: 'quadro', descricao: 'O andamento dos pedidos de hoje.' });

    expect(screen.queryByText('O andamento dos pedidos de hoje.')).toBeNull();
  });

  it('no modo documento a descrição continua aparecendo', () => {
    montar({ descricao: 'O andamento dos pedidos de hoje.' });

    expect(screen.getByText('O andamento dos pedidos de hoje.')).toBeInTheDocument();
  });

  it('o conteúdo recebe a altura que sobra', () => {
    // Sem isto o kanban não sabe até onde pode crescer e as colunas ficam com
    // a altura do conteúdo — rolagem dupla, e o rodapé da coluna some.
    const { container } = montar({ variante: 'quadro' });

    const conteudo = screen.getByTestId('conteudo').parentElement;
    expect(conteudo?.className).toMatch(/flex-1/);
    expect(conteudo?.className).toMatch(/min-h-0/);
    expect(container.firstElementChild?.className).toMatch(/h-full/);
  });

  it('no modo documento o conteúdo NÃO estica', () => {
    montar();

    const conteudo = screen.getByTestId('conteudo').parentElement;
    expect(conteudo?.className).not.toMatch(/flex-1/);
  });
});
