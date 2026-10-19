/**
 * Etapas Produtos e Pagamento do formulário de emissão.
 *
 * 19/10, Ivoneth: coffee break de 50 pessoas virou 60 com entrega. Sem onde
 * pôr o item na nota, entrou um acréscimo solto e a SEFAZ recusou ("ausência
 * de troco"). Agora o item entra pela etapa Produtos e é gravado NO PEDIDO
 * antes de a nota sair.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EmitirNota } from '../EmitirNota';
import { fiscalService } from '../../../services/fiscal';
import { ordersService } from '../../../services/orders';
import { ajusteDoPedido, calcularConta, linhasDoPedido, valoresDoPedido } from '../contaDaNota';

jest.mock('../../../services/fiscal', () => ({
  fiscalService: {
    listarPedidos: jest.fn(),
    listarDestinatarios: jest.fn(),
    consultarCnpj: jest.fn(),
    emitir: jest.fn(),
  },
}));

jest.mock('../../../services/orders', () => ({
  ordersService: { adjustOrder: jest.fn() },
}));

jest.mock('../../../services/products', () => ({
  productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) },
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {},
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const fiscal = fiscalService as jest.Mocked<typeof fiscalService>;
const pedidos = ordersService as jest.Mocked<typeof ordersService>;

const PEDIDO = {
  id: 'p9', order_number: 'IVO2610194941', customer_name: 'Sindicato', total: '1745.00',
  created_at: '2026-10-19T19:29:43Z', delivery_method: 'pickup', payment_method: 'cash', notas: [],
  itens: [{
    id: 'i1', nome: 'Encomenda Coffee Break 50 Pessoas', quantidade: 1,
    valor_unitario: '1695.00', subtotal: '1695.00', do_cardapio: true,
  }],
  valores: {
    itens: '1695.00', frete: '50.00', desconto: '0.00', acrescimo: '0.00', taxa_do_vale: '0.00', total: '1745.00',
  },
  sugestao: {
    documento: '', nome: 'Sindicato', inscricao_estadual: '', email: '',
    endereco: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '' },
  },
};

describe('conta da nota', () => {
  it('nada mudou: não toca no pedido', () => {
    expect(ajusteDoPedido(PEDIDO as never, linhasDoPedido(PEDIDO as never), valoresDoPedido(PEDIDO as never)))
      .toBeNull();
  });

  it('item fora do cardápio, preço e frete viram um ajuste só', () => {
    const linhas = linhasDoPedido(PEDIDO as never);
    linhas[0] = { ...linhas[0], valor: '1994,00', nome: 'Coffee Break 60 Pessoas' };
    linhas.push({ chave: 'n1', nome: 'Garrafa térmica', quantidade: 2, valor: '15', doCardapio: false });
    const valores = { ...valoresDoPedido(PEDIDO as never), frete: '60' };

    expect(ajusteDoPedido(PEDIDO as never, linhas, valores)).toEqual({
      delivery_fee: 60,
      item_ops: [
        { op: 'update', item_id: 'i1', quantity: 1, unit_price: 1994, name: 'Coffee Break 60 Pessoas' },
        { op: 'add_custom', name: 'Garrafa térmica', quantity: 2, unit_price: 15 },
      ],
    });
    expect(calcularConta(linhas, valores).total).toBe(1994 + 30 + 60);
  });
});

describe('EmitirNota — etapa Produtos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fiscal.listarDestinatarios.mockResolvedValue([]);
    fiscal.listarPedidos.mockResolvedValue([PEDIDO] as never);
    fiscal.emitir.mockResolvedValue({ id: 'n1', status: 'authorized', modelo: '65' } as never);
    pedidos.adjustOrder.mockResolvedValue({} as never);
  });

  const abrir = async () => {
    render(
      <EmitirNota aberto onFechar={jest.fn()} loja="ivoneth" pedidoInicial="p9" onEmitida={jest.fn()} />,
    );
    const dialogo = await screen.findByRole('dialog');
    await within(dialogo).findByText('IVO2610194941');
    return dialogo;
  };

  it('item fora do cardápio vai para o pedido antes de a nota sair', async () => {
    const dialogo = await abrir();
    fireEvent.click(within(dialogo).getByRole('tab', { name: 'Produtos' }));
    fireEvent.click(within(dialogo).getByRole('button', { name: /Item fora do cardápio/ }));

    const nomes = within(dialogo).getAllByLabelText('Nome do item');
    const valores = within(dialogo).getAllByLabelText('Valor unitário');
    fireEvent.change(nomes[1], { target: { value: 'Adicional 10 pessoas' } });
    fireEvent.change(valores[1], { target: { value: '299' } });

    fireEvent.click(within(dialogo).getByRole('tab', { name: 'Pagamento' }));
    expect(within(dialogo).getAllByText(/2\.044,00/).length).toBeGreaterThan(0);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NFC-e' }));

    await waitFor(() => expect(fiscal.emitir).toHaveBeenCalledTimes(1));
    expect(pedidos.adjustOrder).toHaveBeenCalledWith('p9', {
      item_ops: [{ op: 'add_custom', name: 'Adicional 10 pessoas', quantity: 1, unit_price: 299 }],
    }, 'ivoneth');
    expect(pedidos.adjustOrder.mock.invocationCallOrder[0])
      .toBeLessThan(fiscal.emitir.mock.invocationCallOrder[0]);
  });

  it('item sem valor segura a emissão na etapa Produtos', async () => {
    const dialogo = await abrir();
    fireEvent.click(within(dialogo).getByRole('tab', { name: 'Produtos' }));
    fireEvent.click(within(dialogo).getByRole('button', { name: /Item fora do cardápio/ }));
    fireEvent.change(within(dialogo).getAllByLabelText('Nome do item')[1], { target: { value: 'Adicional' } });

    fireEvent.click(within(dialogo).getByRole('tab', { name: 'Cliente' }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NFC-e' }));

    expect(await within(dialogo).findByText('Informe o valor')).toBeInTheDocument();
    expect(within(dialogo).getByRole('tab', { name: /Produtos/ })).toHaveAttribute('aria-selected', 'true');
    expect(pedidos.adjustOrder).not.toHaveBeenCalled();
    expect(fiscal.emitir).not.toHaveBeenCalled();
  });
});
