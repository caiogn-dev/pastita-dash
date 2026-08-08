/**
 * Checklist ao vivo: o que falta para salvar, visível o tempo todo.
 *
 * O formulário de produto só contava a verdade quando você clicava em salvar —
 * e aí devolvia um toast. Melhoramos pulando para a aba do erro, mas isso
 * ainda é diagnóstico DEPOIS da tentativa: o botão continua sendo uma roleta.
 *
 * O checklist inverte: cada requisito é uma linha com ✓ ou !, atualizada
 * enquanto se digita. Você não descobre o que falta ao salvar — você vê o que
 * falta antes de tentar, e o salvar deixa de surpreender.
 *
 * O estado NÃO pode viver só na cor: verde e vermelho são a mesma coisa para
 * quem não distingue as duas, e para leitor de tela não existem.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FormChecklist } from '../FormChecklist';

const ITENS = [
  { rotulo: 'Nome preenchido', ok: false },
  { rotulo: 'Preço maior que zero', ok: true },
  { rotulo: 'Categoria escolhida', ok: true },
];

describe('FormChecklist', () => {
  it('mostra cada requisito com seu estado', () => {
    render(<FormChecklist itens={ITENS} />);
    expect(screen.getByText('Nome preenchido')).toBeInTheDocument();
    expect(screen.getByText('Preço maior que zero')).toBeInTheDocument();
  });

  it('o estado tem texto, não só cor', () => {
    // Verde e vermelho são idênticos para quem não distingue as duas cores, e
    // inexistentes para leitor de tela.
    render(<FormChecklist itens={ITENS} />);
    expect(screen.getAllByText(/pendente/i)).toHaveLength(1);
    expect(screen.getAllByText(/concluíd/i)).toHaveLength(2);
  });

  it('resume quantos faltam', () => {
    // "2 de 3" responde "estou perto?" sem contar linha por linha.
    render(<FormChecklist itens={ITENS} />);
    expect(screen.getByText(/2 de 3/)).toBeInTheDocument();
  });

  it('tudo pronto muda o resumo, em vez de sumir', () => {
    // Sumir a seção quando está tudo certo tira a confirmação justo na hora em
    // que ela vale mais — antes de apertar salvar.
    render(<FormChecklist itens={ITENS.map((i) => ({ ...i, ok: true }))} />);
    expect(screen.getByText(/tudo pronto/i)).toBeInTheDocument();
  });

  it('o item pendente pode levar ao campo', () => {
    // Saber o que falta e não saber onde é meio caminho. Com `onIr`, a linha
    // vira botão e leva ao lugar.
    const ir = jest.fn();
    render(<FormChecklist itens={[{ rotulo: 'Nome preenchido', ok: false, onIr: ir }]} />);
    screen.getByRole('button', { name: /Nome preenchido/ }).click();
    expect(ir).toHaveBeenCalledTimes(1);
  });

  it('item concluído não vira botão', () => {
    // Não há para onde ir consertar o que está certo.
    render(<FormChecklist itens={[{ rotulo: 'Preço', ok: true, onIr: jest.fn() }]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lista vazia não renderiza nada', () => {
    const { container } = render(<FormChecklist itens={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
