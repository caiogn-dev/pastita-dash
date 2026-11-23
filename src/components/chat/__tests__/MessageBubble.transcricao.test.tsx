/** Áudio do cliente chega transcrito (Whisper/NVIDIA): o atendente lê sem ouvir. */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';

const audio = {
  id: 'a1',
  direction: 'inbound' as const,
  status: 'delivered' as const,
  messageType: 'audio',
  mediaUrl: 'https://backend.pastita.com.br/media/whatsapp/a.ogg',
  mimeType: 'audio/ogg',
  createdAt: '2026-11-23T20:00:00Z',
};

it('mostra a transcrição do áudio marcada como transcrição', () => {
  render(<MessageBubble {...audio} textBody="Quero duas saladas sem cebola" />);
  expect(screen.getByText('Quero duas saladas sem cebola')).toBeInTheDocument();
  expect(screen.getByText(/transcrição/i)).toBeInTheDocument();
});

it('áudio sem transcrição não ganha rótulo', () => {
  render(<MessageBubble {...audio} />);
  expect(screen.queryByText(/transcrição/i)).not.toBeInTheDocument();
});

it('texto comum não ganha rótulo de transcrição', () => {
  render(<MessageBubble {...audio} messageType="text" mediaUrl={undefined} textBody="oi" />);
  expect(screen.queryByText(/transcrição/i)).not.toBeInTheDocument();
});
