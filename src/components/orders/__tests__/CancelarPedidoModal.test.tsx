/**
 * Cancelar pedido pede o motivo.
 *
 * 19/09: 0 dos 37 pedidos cancelados em 30 dias tinham motivo — a lista
 * cancelava com um "tem certeza?" e o detalhe também. Sem motivo, o dono não
 * sabe se perde venda por produto que acaba, pagamento que não cai ou
 * cliente que desiste.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CancelarPedidoModal } from '../CancelarPedidoModal';

const abrir = (onConfirm = jest.fn()) => {
  render(
    <CancelarPedidoModal open orderNumber="CE-123" loading={false} onClose={jest.fn()} onConfirm={onConfirm} />,
  );
  return onConfirm;
};

it('não deixa cancelar sem escolher o motivo', () => {
  abrir();
  expect(screen.getByRole('button', { name: /confirmar cancelamento/i })).toBeDisabled();
});

it('com um motivo escolhido, cancela mandando o motivo', () => {
  const onConfirm = abrir();
  fireEvent.click(screen.getByRole('radio', { name: /acabou o produto/i }));
  fireEvent.click(screen.getByRole('button', { name: /confirmar cancelamento/i }));
  expect(onConfirm).toHaveBeenCalledWith('Acabou o produto');
});

it('"Outro" exige escrever o motivo', () => {
  const onConfirm = abrir();
  fireEvent.click(screen.getByRole('radio', { name: /outro/i }));
  expect(screen.getByRole('button', { name: /confirmar cancelamento/i })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/qual o motivo/i), { target: { value: 'Endereço errado' } });
  fireEvent.click(screen.getByRole('button', { name: /confirmar cancelamento/i }));
  expect(onConfirm).toHaveBeenCalledWith('Endereço errado');
});

it('mostra o número do pedido', () => {
  abrir();
  expect(screen.getByText(/CE-123/)).toBeInTheDocument();
});
