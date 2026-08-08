/**
 * Assistente de passos: um formulário longo vira uma sequência com fim visível.
 *
 * O modal de produto tem seis abas soltas. Abas dizem "escolha uma"; passos
 * dizem "faça nesta ordem e acaba aqui". Num cadastro que a pessoa faz pela
 * primeira vez, a diferença é entre saber quanto falta e não saber.
 *
 * Três comportamentos que separam um assistente de uma fileira de botões:
 *
 *   - o primário muda no ÚLTIMO passo (`Avançar` → `Salvar`), então você sabe
 *     qual clique conclui sem precisar ler;
 *   - passo com pendência é marcado, e você pode voltar a ele direto;
 *   - avançar não pode passar por cima de erro do passo atual — senão o
 *     assistente vira decoração e o erro só aparece no fim.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FormStepper } from '../FormStepper';

const PASSOS = [
  { id: 'basico', rotulo: 'Básico' },
  { id: 'preco', rotulo: 'Preço' },
  { id: 'midia', rotulo: 'Mídia' },
];

function montar(props: Partial<React.ComponentProps<typeof FormStepper>> = {}) {
  return render(
    <FormStepper
      passos={PASSOS}
      onConcluir={jest.fn()}
      rotuloConcluir="Criar produto"
      {...props}
    >
      {(passo) => <div data-testid="painel">{passo}</div>}
    </FormStepper>
  );
}

describe('FormStepper', () => {
  it('começa no primeiro passo', () => {
    montar();
    expect(screen.getByTestId('painel')).toHaveTextContent('basico');
    expect(screen.getByRole('button', { name: /Avançar/ })).toBeInTheDocument();
  });

  it('avança e volta', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Avançar/ }));
    expect(screen.getByTestId('painel')).toHaveTextContent('preco');

    fireEvent.click(screen.getByRole('button', { name: /Voltar/ }));
    expect(screen.getByTestId('painel')).toHaveTextContent('basico');
  });

  it('no último passo o primário vira a conclusão', () => {
    // É o sinal que evita o "cliquei em avançar achando que ia salvar".
    const onConcluir = jest.fn();
    montar({ onConcluir });
    fireEvent.click(screen.getByRole('button', { name: /Avançar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Avançar/ }));

    expect(screen.queryByRole('button', { name: /Avançar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Criar produto' }));
    expect(onConcluir).toHaveBeenCalledTimes(1);
  });

  it('no primeiro passo não há para onde voltar', () => {
    montar();
    expect(screen.queryByRole('button', { name: /^Voltar/ })).not.toBeInTheDocument();
  });

  it('passo com pendência é marcado e continua alcançável', () => {
    // Marcar sem deixar clicar seria acusar o problema e trancar a saída.
    montar({ passos: [{ ...PASSOS[0], pendente: true }, PASSOS[1], PASSOS[2]] });
    const passo = screen.getByRole('button', { name: /Básico/ });
    expect(passo).toBeEnabled();
    expect(screen.getByText(/requer atenção/i)).toBeInTheDocument();
  });

  it('clicar num passo da trilha pula direto para ele', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Mídia/ }));
    expect(screen.getByTestId('painel')).toHaveTextContent('midia');
  });

  it('avançar respeita o bloqueio do passo atual', () => {
    // Deixar passar transforma o assistente em decoração: o erro só apareceria
    // no fim, depois de a pessoa preencher tudo o mais.
    montar({ podeAvancar: () => false });
    fireEvent.click(screen.getByRole('button', { name: /Avançar/ }));
    expect(screen.getByTestId('painel')).toHaveTextContent('basico');
  });

  it('anuncia o progresso em texto, não só na cor da bolinha', () => {
    montar();
    expect(screen.getByText(/Passo 1 de 3/i)).toBeInTheDocument();
  });
});

describe('FormStepper controlado', () => {
  it('o pai manda no passo, e é avisado quando ele muda', () => {
    // A validação e o checklist precisam empurrar a pessoa para o lugar do
    // erro. Com o passo em estado interno, ninguém de fora consegue.
    const onMudarPasso = jest.fn();
    const { rerender } = render(
      <FormStepper
        passos={PASSOS}
        onConcluir={jest.fn()}
        rotuloConcluir="Salvar"
        passoAtivo="preco"
        onMudarPasso={onMudarPasso}
      >
        {(p) => <div data-testid="painel">{p}</div>}
      </FormStepper>
    );
    expect(screen.getByTestId('painel')).toHaveTextContent('preco');

    fireEvent.click(screen.getByRole('button', { name: /Avançar/ }));
    expect(onMudarPasso).toHaveBeenCalledWith('midia');

    // Controlado de verdade: só muda quando o pai manda.
    expect(screen.getByTestId('painel')).toHaveTextContent('preco');

    rerender(
      <FormStepper
        passos={PASSOS}
        onConcluir={jest.fn()}
        rotuloConcluir="Salvar"
        passoAtivo="midia"
        onMudarPasso={onMudarPasso}
      >
        {(p) => <div data-testid="painel">{p}</div>}
      </FormStepper>
    );
    expect(screen.getByTestId('painel')).toHaveTextContent('midia');
  });

  it('passo controlado que não existe cai no primeiro, em vez de sumir a tela', () => {
    // Acontece de verdade: `variants` só existe na edição. Ao criar, o pai
    // pode apontar para um passo que a lista não tem.
    render(
      <FormStepper
        passos={PASSOS}
        onConcluir={jest.fn()}
        rotuloConcluir="Salvar"
        passoAtivo="passo-que-nao-existe"
        onMudarPasso={jest.fn()}
      >
        {(p) => <div data-testid="painel">{p}</div>}
      </FormStepper>
    );
    expect(screen.getByTestId('painel')).toHaveTextContent('basico');
  });
});
