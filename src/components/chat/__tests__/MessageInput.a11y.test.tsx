import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageInput } from '../MessageInput';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  success: jest.fn(),
  error: jest.fn(),
}));

describe('MessageInput — acessibilidade dos botões icon-only', () => {
  // jsdom não implementa createObjectURL/revokeObjectURL; o preview de imagem
  // os usa. Mockamos para toda a suíte para evitar quebras no unmount.
  beforeAll(() => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(
      () => 'blob:preview'
    );
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
  });
  afterAll(() => {
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it('expõe nome acessível nos botões de anexar, emoji e enviar', () => {
    render(<MessageInput onSend={jest.fn()} />);

    // Botões apenas com ícone precisam de nome acessível para leitores de tela.
    expect(
      screen.getByRole('button', { name: /anexar arquivo/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /emoji/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /enviar mensagem/i })
    ).toBeInTheDocument();
  });

  it('sinaliza estado de carregamento no botão de enviar', () => {
    render(<MessageInput onSend={jest.fn()} isLoading />);
    const enviar = screen.getByRole('button', { name: /enviar mensagem/i });
    expect(enviar).toHaveAttribute('aria-busy', 'true');
  });

  it('expõe nome acessível no botão de remover arquivo (documento)', () => {
    const file = new File(['conteudo'], 'contrato.pdf', {
      type: 'application/pdf',
    });
    render(
      <MessageInput
        onSend={jest.fn()}
        selectedFile={file}
        onClearFile={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /remover arquivo/i })
    ).toBeInTheDocument();
  });

  it('expõe nome acessível no botão de remover arquivo (imagem)', () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    render(
      <MessageInput
        onSend={jest.fn()}
        selectedFile={file}
        onClearFile={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /remover arquivo/i })
    ).toBeInTheDocument();
  });
});
