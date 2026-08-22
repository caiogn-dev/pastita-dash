import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageBubble, MessageBubbleProps } from '../MessageBubble';

const baseProps: MessageBubbleProps = {
  id: 'msg-1',
  direction: 'inbound',
  status: 'delivered',
  messageType: 'text',
  createdAt: '2026-08-22T12:00:00Z',
};

// Antes desta fatia, tipos tratados apenas dentro de MediaPreview
// (reaction, button, contacts, order, system, sticker) nunca eram
// renderizados: o balão só chamava MediaPreview para mídia (image/video/
// audio/document) ou location. Resultado: balões vazios, só com horário.
describe('MessageBubble — tipos especiais de mensagem', () => {
  it('renderiza uma reação com o emoji recebido', () => {
    render(
      <MessageBubble
        {...baseProps}
        messageType="reaction"
        content={JSON.stringify({ emoji: '🎉' })}
      />
    );

    expect(screen.getByText('🎉')).toBeInTheDocument();
    expect(screen.getByText('Reagiu')).toBeInTheDocument();
  });

  it('renderiza a resposta de botão pelo texto do content', () => {
    render(
      <MessageBubble
        {...baseProps}
        messageType="button"
        content={JSON.stringify({ text: 'Confirmar pedido' })}
      />
    );

    expect(screen.getByText(/Confirmar pedido/)).toBeInTheDocument();
  });

  it('renderiza um contato compartilhado com nome e telefone', () => {
    render(
      <MessageBubble
        {...baseProps}
        messageType="contacts"
        content={JSON.stringify([
          { name: { formatted_name: 'Maria Silva' }, phones: [{ phone: '+55 11 99999-0000' }] },
        ])}
      />
    );

    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('+55 11 99999-0000')).toBeInTheDocument();
  });

  it('renderiza o cartão de pedido do WhatsApp', () => {
    render(
      <MessageBubble
        {...baseProps}
        messageType="order"
        content={JSON.stringify({ product_items: [{}, {}] })}
      />
    );

    expect(screen.getByText('Pedido WhatsApp')).toBeInTheDocument();
  });

  it('renderiza uma mensagem de sistema com o texto do content', () => {
    render(
      <MessageBubble
        {...baseProps}
        messageType="system"
        content="Conversa transferida para atendente"
      />
    );

    expect(screen.getByText('Conversa transferida para atendente')).toBeInTheDocument();
  });

  it('renderiza um sticker como imagem quando há mídia', () => {
    render(
      <MessageBubble
        {...baseProps}
        messageType="sticker"
        mediaUrl="https://cdn.example.com/sticker.webp"
      />
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
