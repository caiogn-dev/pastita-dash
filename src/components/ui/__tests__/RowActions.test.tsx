/**
 * Ações de linha: um kebab, não quatro botões soltos.
 *
 * Hoje cada tabela resolve isso do seu jeito. Em Cupons são três ícones nus na
 * última coluna; em Clientes não há ação nenhuma e você precisa abrir o
 * detalhe. Três problemas nisso:
 *
 *   - Ícone sem rótulo é adivinhação. Lápis todo mundo lê; "duplicar" já não.
 *   - Cada ação a mais come largura da tabela, e é a tabela que carrega o dado.
 *   - Ação destrutiva (excluir) fica a um clique de distância, do lado das
 *     inofensivas, no lugar onde o dedo cai ao rolar no celular.
 *
 * O kebab resolve os três: rótulo em texto, largura fixa de uma coluna, e o
 * destrutivo separado por uma linha no fim do menu.
 *
 * `linhaClicavel` existe pelo motivo oposto: a linha inteira deve abrir o
 * detalhe, mas `onClick` num `<tr>` é invisível para o teclado. O helper
 * devolve foco, rótulo e Enter/Espaço — e deliberadamente NÃO troca o papel do
 * `<tr>` por "button", porque isso removeria a linha da estrutura da tabela.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { RowActions, linhaClicavel } from '../RowActions';

const abrir = jest.fn();
const excluir = jest.fn();

beforeEach(() => {
  abrir.mockClear();
  excluir.mockClear();
});

describe('RowActions', () => {
  it('as ações só aparecem depois de abrir o menu', () => {
    render(
      <RowActions
        rotulo="Ações do cupom BEMVINDO"
        acoes={[{ rotulo: 'Editar', onClick: abrir }]}
      />
    );
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ações do cupom BEMVINDO' }));
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
  });

  it('clicar numa ação executa e fecha o menu', () => {
    render(<RowActions rotulo="Ações" acoes={[{ rotulo: 'Editar', onClick: abrir }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('o menu não dispara o clique da linha', () => {
    // Sem stopPropagation, abrir o menu navegaria para o detalhe e o menu
    // sumiria junto com a página — a ação ficaria inalcançável.
    const cliqueDaLinha = jest.fn();
    render(
      <tr onClick={cliqueDaLinha}>
        <td>
          <RowActions rotulo="Ações" acoes={[{ rotulo: 'Editar', onClick: abrir }]} />
        </td>
      </tr>,
      { container: document.body.appendChild(document.createElement('tbody')) }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    expect(cliqueDaLinha).not.toHaveBeenCalled();
  });

  it('Esc fecha sem executar nada', () => {
    render(<RowActions rotulo="Ações" acoes={[{ rotulo: 'Editar', onClick: abrir }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument();
    expect(abrir).not.toHaveBeenCalled();
  });

  it('a ação destrutiva fica visualmente separada das demais', () => {
    render(
      <RowActions
        rotulo="Ações"
        acoes={[
          { rotulo: 'Editar', onClick: abrir },
          { rotulo: 'Excluir', onClick: excluir, destrutiva: true },
        ]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    const excluirItem = screen.getByRole('menuitem', { name: 'Excluir' });
    expect(excluirItem.className).toContain('danger');
  });

  it('ação desabilitada não executa', () => {
    render(
      <RowActions
        rotulo="Ações"
        acoes={[{ rotulo: 'Editar', onClick: abrir, desabilitada: true }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(abrir).not.toHaveBeenCalled();
  });
});

describe('linhaClicavel', () => {
  it('a linha é alcançável e acionável pelo teclado', () => {
    const props = linhaClicavel(abrir, 'Abrir pedido #123');
    expect(props.tabIndex).toBe(0);
    expect(props['aria-label']).toBe('Abrir pedido #123');

    render(<div {...props} data-testid="linha">conteúdo</div>);
    const linha = screen.getByTestId('linha');

    fireEvent.keyDown(linha, { key: 'Enter' });
    expect(abrir).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(linha, { key: ' ' });
    expect(abrir).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(linha, { key: 'a' });
    expect(abrir).toHaveBeenCalledTimes(2);
  });

  it('NÃO troca o papel da linha por "button"', () => {
    // Trocar o papel de um <tr> o tira da estrutura da tabela: o leitor de
    // tela para de anunciar "linha 4 de 20" e de casar célula com cabeçalho.
    // Ganha-se um botão e perde-se a tabela — péssimo negócio, ainda mais
    // porque a mesma ação já existe como botão de verdade no RowActions.
    expect((linhaClicavel(abrir, 'x') as Record<string, unknown>).role).toBeUndefined();
  });
});
