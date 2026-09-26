/**
 * Faixa "por que o bot parou" no topo do chat em modo humano.
 *
 * O atendente abria a conversa e tinha de ler o histórico inteiro para saber
 * o que o cliente queria e onde o bot tinha parado. O bot já sabia: itens,
 * endereço, taxa, observações e o passo do pedido.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ContextoDoBot } from '../ContextoDoBot';
import type { ContextoDoBot as Contexto } from '../../../services/conversations';

const AGORA = Date.parse('2026-09-26T12:00:00Z');

const contexto = (over: Partial<Contexto> = {}): Contexto => ({
  modo: 'human',
  motivo: { codigo: 'pediu_atendente', texto: '', desde: '2026-09-26T11:48:00Z' },
  esperando_ha_segundos: 300,
  ultima_msg_cliente: 'quero falar com alguém',
  ultima_msg_atendente: null,
  carrinho: {
    passo: 'endereco',
    itens: [{ nome: 'Salada Caesar', quantidade: 2, preco: 29.9 }],
    endereco: 'Rua 7, 120 — Centro',
    taxa: 5,
    notas: 'sem cebola',
    entrega: 'delivery',
  },
  cliente: { nome: 'Joana', telefone: '5563999990001', pedidos: 3, ultimo_pedido: '2026-09-12T18:00:00Z' },
  ...over,
});

const renderizar = (props: Partial<React.ComponentProps<typeof ContextoDoBot>> = {}) => {
  const onAssumir = jest.fn();
  const onDevolver = jest.fn();
  render(
    <ContextoDoBot
      contexto={contexto()}
      agora={AGORA}
      falhou={false}
      acao={null}
      erroDaAcao={null}
      onAssumir={onAssumir}
      onDevolver={onDevolver}
      {...props}
    />,
  );
  return { onAssumir, onDevolver };
};

it('diz por que o bot parou e há quanto tempo, em português', () => {
  renderizar();
  expect(screen.getByText('Cliente pediu atendente há 12 min')).toBeInTheDocument();
});

it('mostra o que o bot já anotou: itens, endereço, taxa, observações e o passo', () => {
  renderizar();
  const cartao = screen.getByRole('region', { name: /o bot já anotou/i });
  expect(cartao).toHaveTextContent('2× Salada Caesar');
  expect(cartao).toHaveTextContent('R$ 29,90');
  expect(cartao).toHaveTextContent('Rua 7, 120 — Centro');
  expect(cartao).toHaveTextContent('R$ 5,00');
  expect(cartao).toHaveTextContent('sem cebola');
  expect(cartao).toHaveTextContent('Parou pedindo o endereço');
  expect(cartao).toHaveTextContent('Entrega');
});

it('mostra quem é o cliente: pedidos anteriores', () => {
  renderizar();
  expect(screen.getByText(/3 pedidos/)).toBeInTheDocument();
});

it('sem carrinho, diz que o bot não anotou pedido', () => {
  renderizar({ contexto: contexto({ carrinho: null }) });
  expect(screen.getByText(/ainda não anotou nenhum pedido/i)).toBeInTheDocument();
});

it('Assumir e Devolver ao bot chamam as ações', () => {
  const { onAssumir, onDevolver } = renderizar();
  fireEvent.click(screen.getByRole('button', { name: /assumir/i }));
  fireEvent.click(screen.getByRole('button', { name: /devolver ao bot/i }));
  expect(onAssumir).toHaveBeenCalled();
  expect(onDevolver).toHaveBeenCalled();
});

it('já assumida, não oferece Assumir de novo', () => {
  renderizar({ contexto: contexto({ motivo: { codigo: 'atendente_assumiu', texto: '', desde: null } }) });
  expect(screen.queryByRole('button', { name: /assumir/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /devolver ao bot/i })).toBeInTheDocument();
});

it('botões travam durante a ação', () => {
  renderizar({ acao: 'devolvendo' });
  expect(screen.getByRole('button', { name: /devolver ao bot/i })).toBeDisabled();
});

it('erro da ação aparece na faixa', () => {
  renderizar({ erroDaAcao: 'Não foi possível devolver ao bot.' });
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível devolver ao bot.');
});

it('contexto que não veio não esconde os botões nem finge vazio', () => {
  renderizar({ contexto: null, falhou: true });
  expect(screen.getByText(/não foi possível ver o que o bot anotou/i)).toBeInTheDocument();
  expect(screen.queryByText(/ainda não anotou/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /devolver ao bot/i })).toBeInTheDocument();
});
