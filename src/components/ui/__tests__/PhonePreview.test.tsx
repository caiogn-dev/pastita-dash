/**
 * PhonePreview — ver o que o cliente vê, enquanto edita.
 *
 * Configurar uma página é abstrato: você preenche "Headline", liga quatro
 * switches e não faz ideia de como aquilo fica na tela de quem abre o link do
 * Instagram. A saída de hoje é salvar, abrir noutra aba, voltar, corrigir —
 * três trocas de contexto por ajuste. Ninguém faz isso, então a página fica do
 * jeito que o formulário deixou.
 *
 * A moldura de celular não é enfeite: ela informa a LARGURA em que o conteúdo
 * será lido. Uma headline que cabe numa div de 900px estoura em 390px.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { PhonePreview } from '../PhonePreview';

describe('PhonePreview', () => {
  it('renderiza a página real, não um desenho dela', () => {
    render(<PhonePreview url="https://bio.cardapidex.com.br/minha-loja" titulo="Pré-visualização" />);
    const frame = screen.getByTitle('Pré-visualização');
    expect(frame).toHaveAttribute('src', 'https://bio.cardapidex.com.br/minha-loja');
  });

  it('recarregar troca a identidade do frame para forçar novo fetch', () => {
    // Mudar só o `src` para a MESMA url não recarrega o iframe. Trocar a `key`
    // recria o elemento — é o que faz o preview refletir o que acabou de salvar.
    render(<PhonePreview url="https://bio.cardapidex.com.br/x" titulo="Preview" />);
    const antes = screen.getByTitle('Preview');
    fireEvent.click(screen.getByRole('button', { name: /atualizar/i }));
    expect(screen.getByTitle('Preview')).not.toBe(antes);
  });

  it('sem url mostra o motivo em vez de um retângulo vazio', () => {
    render(<PhonePreview url="" titulo="Preview" />);
    expect(screen.queryByTitle('Preview')).not.toBeInTheDocument();
    expect(screen.getByText(/indisponível/i)).toBeInTheDocument();
  });

  it('o selo de tempo real só aparece quando é verdade', () => {
    const { rerender } = render(<PhonePreview url="https://x" titulo="P" aoVivo />);
    expect(screen.getByText(/tempo real/i)).toBeInTheDocument();

    rerender(<PhonePreview url="https://x" titulo="P" />);
    expect(screen.queryByText(/tempo real/i)).not.toBeInTheDocument();
  });
});

describe('PhonePreview — computador e canal ao vivo', () => {
  it('entrega o iframe para quem vai conversar com ele', () => {
    const registrar = jest.fn();
    render(<PhonePreview url="https://x/preview/loja" titulo="P" iframeRef={registrar} />);
    expect(registrar).toHaveBeenCalledWith(screen.getByTitle('P'));
  });

  it('alterna celular/computador sem recarregar a página', () => {
    const onDispositivo = jest.fn();
    const { rerender } = render(
      <PhonePreview url="https://x" titulo="P" dispositivo="celular" onDispositivo={onDispositivo} />,
    );
    const antes = screen.getByTitle('P');
    expect(screen.getByRole('button', { name: /celular/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /computador/i }));
    expect(onDispositivo).toHaveBeenCalledWith('computador');

    rerender(<PhonePreview url="https://x" titulo="P" dispositivo="computador" onDispositivo={onDispositivo} />);
    // Mesmo elemento: o rascunho que a prévia recebeu continua lá.
    expect(screen.getByTitle('P')).toBe(antes);
    expect(screen.getByTitle('P').style.width).toBe('1280px');
  });

  it('sem onDispositivo não mostra a troca', () => {
    render(<PhonePreview url="https://x" titulo="P" />);
    expect(screen.queryByRole('button', { name: /computador/i })).not.toBeInTheDocument();
  });
});
