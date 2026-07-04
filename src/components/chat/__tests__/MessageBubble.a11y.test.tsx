import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble, MessageBubbleProps } from '../MessageBubble';

const baseProps: MessageBubbleProps = {
  id: 'msg-1',
  direction: 'inbound',
  messageType: 'audio',
  status: 'delivered',
  mediaUrl: 'https://cdn.example.com/audio.ogg',
  mimeType: 'audio/ogg',
  fileName: 'nota-de-voz.ogg',
  createdAt: '2026-07-04T12:00:00Z',
};

describe('MessageBubble — acessibilidade do player de áudio', () => {
  it('expõe nome acessível nos controles icon-only do áudio', () => {
    render(<MessageBubble {...baseProps} />);

    // Controles icon-only precisam de nome acessível para leitores de tela.
    expect(screen.getByRole('button', { name: /reproduzir áudio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /silenciar áudio/i })).toBeInTheDocument();
    // Slider de posição da reprodução.
    expect(screen.getByRole('slider', { name: /posição do áudio/i })).toBeInTheDocument();
  });

  it('alterna o rótulo do botão de mudo ao acionar', () => {
    const { container } = render(<MessageBubble {...baseProps} />);

    // jsdom não dispara loadedmetadata sozinho; simulamos o áudio pronto para
    // habilitar os controles (que ficam disabled enquanto carregam).
    const audioEl = container.querySelector('audio');
    expect(audioEl).not.toBeNull();
    fireEvent.loadedMetadata(audioEl as HTMLAudioElement);

    const mudo = screen.getByRole('button', { name: /silenciar áudio/i });
    fireEvent.click(mudo);

    // Após silenciar, o rótulo passa a oferecer reativar o som.
    expect(screen.getByRole('button', { name: /ativar som do áudio/i })).toBeInTheDocument();
  });
});
