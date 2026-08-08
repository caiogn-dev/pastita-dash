/**
 * Escolha binária como dois cards, não como toggle.
 *
 * Um toggle mostra UM rótulo e esconde metade da decisão: "Ativo" ligado você
 * entende; desligado, você adivinha — expirado? escondido? excluído? Toggle
 * funciona para claro/escuro porque os dois estados são óbvios e reversíveis
 * sem consequência. `is_active` num cupom não é nada disso: o estado desligado
 * muda o que o cliente consegue fazer no checkout.
 *
 * Dois cards nomeiam e explicam OS DOIS lados antes da escolha.
 *
 * Isto não é um `radiogroup` decorado: é um radiogroup de verdade, com a
 * navegação por setas que o padrão exige — senão quem usa teclado precisa de
 * um Tab por opção, e num grupo de quatro isso é pior que o `<select>` que
 * estamos substituindo.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ChoiceCards } from '../ChoiceCards';

const OPCOES = [
  { valor: 'ativo', titulo: 'Ativo', descricao: 'Disponível para uso nos pedidos' },
  { valor: 'inativo', titulo: 'Inativo', descricao: 'Fora de operação' },
];

describe('ChoiceCards', () => {
  it('mostra os dois lados, com a consequência de cada um', () => {
    render(<ChoiceCards rotulo="Operação" opcoes={OPCOES} valor="ativo" onChange={jest.fn()} />);
    expect(screen.getByText('Disponível para uso nos pedidos')).toBeInTheDocument();
    expect(screen.getByText('Fora de operação')).toBeInTheDocument();
  });

  it('é um radiogroup de verdade', () => {
    render(<ChoiceCards rotulo="Operação" opcoes={OPCOES} valor="ativo" onChange={jest.fn()} />);
    expect(screen.getByRole('radiogroup', { name: 'Operação' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Ativo/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Inativo/ })).not.toBeChecked();
  });

  it('clicar no card escolhe', () => {
    const onChange = jest.fn();
    render(<ChoiceCards rotulo="Operação" opcoes={OPCOES} valor="ativo" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /Inativo/ }));
    expect(onChange).toHaveBeenCalledWith('inativo');
  });

  it('as setas percorrem as opções, e circulam', () => {
    const onChange = jest.fn();
    render(<ChoiceCards rotulo="Operação" opcoes={OPCOES} valor="ativo" onChange={onChange} />);
    const primeiro = screen.getByRole('radio', { name: /Ativo/ });

    fireEvent.keyDown(primeiro, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('inativo');

    fireEvent.keyDown(primeiro, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('inativo'); // circula para o último
  });

  it('só a opção escolhida entra na ordem de Tab', () => {
    // Padrão de radiogroup: Tab entra no grupo e cai na opção atual; as outras
    // se alcançam pelas setas. Com todas tabbable, um grupo de quatro custa
    // quatro Tabs para atravessar.
    render(<ChoiceCards rotulo="Operação" opcoes={OPCOES} valor="ativo" onChange={jest.fn()} />);
    expect(screen.getByRole('radio', { name: /Ativo/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: /Inativo/ })).toHaveAttribute('tabindex', '-1');
  });

  it('aceita mais de duas opções', () => {
    // O padrão vale para qualquer escolha excludente curta, não só binária.
    render(
      <ChoiceCards
        rotulo="Tipo"
        opcoes={[...OPCOES, { valor: 'rascunho', titulo: 'Rascunho', descricao: 'Ainda não publicado' }]}
        valor="rascunho"
        onChange={jest.fn()}
      />
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('a descrição do grupo aparece junto do rótulo', () => {
    render(
      <ChoiceCards
        rotulo="Operação"
        descricao="Disponibilidade do cupom para novos pedidos."
        opcoes={OPCOES}
        valor="ativo"
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText(/Disponibilidade do cupom/)).toBeInTheDocument();
  });
});
