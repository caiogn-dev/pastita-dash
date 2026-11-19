/**
 * Cancelar pedido pede o motivo.
 *
 * 19/09: 0 dos 37 pedidos cancelados em 30 dias tinham motivo — a lista
 * cancelava com um "tem certeza?" e o detalhe também. Sem motivo, o dono não
 * sabe se perde venda por produto que acaba, pagamento que não cai ou
 * cliente que desiste.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../../../services/ifoodPedido', () => ({
  __esModule: true,
  ifoodPedidoService: { motivosDeCancelamento: jest.fn(), cancelar: jest.fn() },
}));
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

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

describe('pedido do iFood: motivo do iFood', () => {
  const motivos = jest.fn();
  const cancelar = jest.fn();
  beforeAll(() => {
    const svc = jest.requireMock('../../../services/ifoodPedido').ifoodPedidoService;
    svc.motivosDeCancelamento.mockImplementation((...a: unknown[]) => motivos(...a));
    svc.cancelar.mockImplementation((...a: unknown[]) => cancelar(...a));
  });
  beforeEach(() => {
    motivos.mockReset().mockResolvedValue([
      { codigo: '501', descricao: 'Problemas de sistema' },
      { codigo: '503', descricao: 'Item indisponível' },
    ]);
    cancelar.mockReset().mockResolvedValue({ status: 'cancelled', ifood: {} });
    jest.requireMock('react-hot-toast').default.error.mockReset();
  });

  const abrirIfood = (onCancelado = jest.fn(), onConfirm = jest.fn()) => {
    render(
      <CancelarPedidoModal
        open
        orderNumber="CE-9"
        loading={false}
        onClose={jest.fn()}
        onConfirm={onConfirm}
        pedidoId="p9"
        origem="ifood"
        onCancelado={onCancelado}
      />,
    );
    return { onCancelado, onConfirm };
  };

  it('lista os motivos do iFood em vez dos da loja', async () => {
    abrirIfood();
    expect(await screen.findByRole('radio', { name: 'Item indisponível' })).toBeInTheDocument();
    expect(motivos).toHaveBeenCalledWith('p9');
    expect(screen.queryByRole('radio', { name: /acabou o produto/i })).toBeNull();
    expect(screen.getByRole('button', { name: /confirmar cancelamento/i })).toBeDisabled();
  });

  it('confirma no iFood com código e detalhe e avisa o sucesso', async () => {
    const { onCancelado, onConfirm } = abrirIfood();
    fireEvent.click(await screen.findByRole('radio', { name: 'Item indisponível' }));
    fireEvent.change(screen.getByLabelText('Detalhe'), { target: { value: 'Acabou o salmão' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar cancelamento/i }));
    await waitFor(() => expect(onCancelado).toHaveBeenCalled());
    expect(cancelar).toHaveBeenCalledWith('p9', '503', 'Acabou o salmão');
    expect(onConfirm).not.toHaveBeenCalled();
    // o iFood confirma pelo evento CAN; até lá o pedido segue aberto
    expect(jest.requireMock('react-hot-toast').default.success).toHaveBeenCalledWith('Cancelamento enviado ao iFood');
  });

  it('sem detalhe envia só o código', async () => {
    const { onCancelado } = abrirIfood();
    fireEvent.click(await screen.findByRole('radio', { name: 'Problemas de sistema' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar cancelamento/i }));
    await waitFor(() => expect(onCancelado).toHaveBeenCalled());
    expect(cancelar).toHaveBeenCalledWith('p9', '501', undefined);
  });

  it('recusa do iFood vira toast e o modal continua', async () => {
    cancelar.mockRejectedValue('Pedido já despachado');
    const { onCancelado } = abrirIfood();
    fireEvent.click(await screen.findByRole('radio', { name: 'Problemas de sistema' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar cancelamento/i }));
    await waitFor(() => expect(jest.requireMock('react-hot-toast').default.error).toHaveBeenCalledWith('Pedido já despachado'));
    expect(onCancelado).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /confirmar cancelamento/i })).toBeEnabled();
  });

  it('falha ao buscar motivos vira toast', async () => {
    motivos.mockRejectedValue('iFood fora do ar');
    abrirIfood();
    await waitFor(() => expect(jest.requireMock('react-hot-toast').default.error).toHaveBeenCalledWith('iFood fora do ar'));
  });

  it('pedido que não é do iFood segue o fluxo da loja', () => {
    render(<CancelarPedidoModal open orderNumber="CE-1" loading={false} onClose={jest.fn()} onConfirm={jest.fn()} pedidoId="p1" origem="web" />);
    expect(screen.getByRole('radio', { name: /acabou o produto/i })).toBeInTheDocument();
    expect(motivos).not.toHaveBeenCalled();
  });
});
