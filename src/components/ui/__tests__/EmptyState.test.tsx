/**
 * EmptyState — tela vazia é oportunidade, não erro.
 *
 * Hoje o inbox sem conversa selecionada deixa 81% da tela preta, sem uma
 * palavra. E a Fidelidade desligada não explica o que ela faria se estivesse
 * ligada — o dono nunca liga aquilo que não entende.
 *
 * Duas variantes, um componente: `vazio` (não há dados ainda) e `ativacao`
 * (a feature existe mas está desligada — aqui a tela VENDE, com benefícios).
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('vazio: título, explicação e ação opcional', () => {
    render(
      <EmptyState
        titulo="Nenhuma conversa selecionada"
        descricao="Escolha um contato à esquerda para ver o histórico."
      />
    );
    expect(screen.getByRole('heading', { name: 'Nenhuma conversa selecionada' })).toBeInTheDocument();
    expect(screen.getByText(/Escolha um contato/)).toBeInTheDocument();
  });

  it('ativação: anuncia o estado do programa e lista os benefícios', () => {
    render(
      <EmptyState
        variante="ativacao"
        estado="Programa inativo"
        titulo="Ative a fidelidade e transforme compras em recompensas."
        descricao="Seus clientes acumulam pontos e trocam por produtos do cardápio."
        acao={<button type="button">Ativar programa</button>}
        beneficios={[
          { titulo: 'Recompensas no cardápio', descricao: 'Clientes trocam pontos por produtos.' },
          { titulo: 'Ticket médio maior', descricao: 'O cliente gasta mais para aproveitar.' },
        ]}
      />
    );
    expect(screen.getByText('Programa inativo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ativar programa' })).toBeInTheDocument();
    expect(screen.getByText('Recompensas no cardápio')).toBeInTheDocument();
    expect(screen.getByText('Ticket médio maior')).toBeInTheDocument();
  });

  it('sem benefícios a variante ativação continua válida', () => {
    render(<EmptyState variante="ativacao" titulo="Ative o cashback" />);
    expect(screen.getByRole('heading', { name: 'Ative o cashback' })).toBeInTheDocument();
  });
});
