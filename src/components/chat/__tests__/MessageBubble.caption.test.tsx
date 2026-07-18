import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageBubble, MessageBubbleProps } from '../MessageBubble';

const baseProps: MessageBubbleProps = {
  id: 'msg-1',
  direction: 'inbound',
  status: 'delivered',
  messageType: 'document',
  createdAt: '2026-07-09T12:00:00Z',
};

describe('MessageBubble — legenda (caption) de mídia', () => {
  it('exibe a legenda de um documento sem duplicar o texto', () => {
    render(
      <MessageBubble
        {...baseProps}
        messageType="document"
        mediaUrl="https://cdn.example.com/orcamento.pdf"
        fileName="orcamento.pdf"
        mimeType="application/pdf"
        textBody="Segue o orçamento em anexo"
      />
    );

    // A legenda do documento não pode ser descartada.
    const legendas = screen.getAllByText('Segue o orçamento em anexo');
    expect(legendas).toHaveLength(1);
  });

  it('exibe a legenda de uma imagem abaixo da mídia', () => {
    render(
      <MessageBubble
        {...baseProps}
        messageType="image"
        mediaUrl="https://cdn.example.com/foto.jpg"
        mimeType="image/jpeg"
        textBody="Olha que legal"
      />
    );

    expect(screen.getByText('Olha que legal')).toBeInTheDocument();
  });
});
