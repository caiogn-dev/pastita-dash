/**
 * Nota fiscal no detalhe do pedido.
 *
 * O que estes testes protegem: o bloco não pode aparecer em loja que não
 * emite (12 das 13 lojas hoje), e CPF com dígito errado não pode chegar ao
 * backend — a SEFAZ rejeitaria a nota inteira e a venda ficaria sem cupom.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NotaFiscalPedido from '../NotaFiscalPedido';
import { ordersService } from '../../../services';

jest.mock('../../../services', () => ({
  ordersService: {
    consultarNfce: jest.fn(),
    emitirNfce: jest.fn(),
    cancelarNfce: jest.fn(),
  },
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const mocked = ordersService as jest.Mocked<typeof ordersService>;

describe('NotaFiscalPedido', () => {
  beforeEach(() => jest.clearAllMocks());

  it('não desenha nada quando a loja não emite nota', async () => {
    mocked.consultarNfce.mockResolvedValue({ habilitado: false, documentos: [] } as never);
    const { container } = render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    await waitFor(() => expect(mocked.consultarNfce).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('oferece o botão de emitir quando a loja emite e o pedido não tem nota', async () => {
    mocked.consultarNfce.mockResolvedValue({ habilitado: true, documentos: [] } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    expect(await screen.findByText('Emitir NFC-e (consumidor)')).toBeInTheDocument();
  });

  it('barra CPF com dígito errado antes de chamar o backend', async () => {
    mocked.consultarNfce.mockResolvedValue({ habilitado: true, documentos: [] } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    const campo = await screen.findByPlaceholderText(/obrigatório na NF-e/i);
    fireEvent.change(campo, { target: { value: '529.982.247-24' } });
    fireEvent.click(screen.getByText('Emitir NFC-e (consumidor)'));
    await waitFor(() => expect(mocked.emitirNfce).not.toHaveBeenCalled());
  });

  it('deixa emitir sem CPF — consumidor não identificado é o padrão', async () => {
    mocked.consultarNfce.mockResolvedValue({ habilitado: true, documentos: [] } as never);
    mocked.emitirNfce.mockResolvedValue({ id: 'a', status: 'authorized', numero: '1' } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    fireEvent.click(await screen.findByText('Emitir NFC-e (consumidor)'));
    await waitFor(() =>
      expect(mocked.emitirNfce).toHaveBeenCalledWith('1', { modelo: '65', cpf: undefined }, 'loja'),
    );
  });

  it('manda o CPF válido limpo de máscara', async () => {
    mocked.consultarNfce.mockResolvedValue({ habilitado: true, documentos: [] } as never);
    mocked.emitirNfce.mockResolvedValue({ id: 'a', status: 'authorized', numero: '1' } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    const campo = await screen.findByPlaceholderText(/obrigatório na NF-e/i);
    fireEvent.change(campo, { target: { value: '529.982.247-25' } });
    fireEvent.click(screen.getByText('Emitir NFC-e (consumidor)'));
    await waitFor(() =>
      expect(mocked.emitirNfce).toHaveBeenCalledWith(
        '1', { modelo: '65', cpf: '529.982.247-25' }, 'loja',
      ),
    );
  });

  it('esconde o cancelamento depois dos 30 minutos e explica o caminho', async () => {
    mocked.consultarNfce.mockResolvedValue({
      habilitado: true,
      documentos: [{
        id: 'a', modelo: '65', status: 'authorized', numero: '10', serie: '1',
        created_at: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      }],
    } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    expect(await screen.findByText(/Prazo de cancelamento encerrado/)).toBeInTheDocument();
    expect(screen.queryByText('Cancelar nota')).not.toBeInTheDocument();
  });

  it('oferece cancelamento dentro da janela', async () => {
    mocked.consultarNfce.mockResolvedValue({
      habilitado: true,
      documentos: [{
        id: 'a', modelo: '65', status: 'authorized', numero: '10', serie: '1',
        created_at: new Date().toISOString(),
      }],
    } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    expect(await screen.findByText('Cancelar nota')).toBeInTheDocument();
  });

  it('exige justificativa de 15 caracteres antes de confirmar', async () => {
    mocked.consultarNfce.mockResolvedValue({
      habilitado: true,
      documentos: [{
        id: 'a', modelo: '65', status: 'authorized', numero: '10', serie: '1',
        created_at: new Date().toISOString(),
      }],
    } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    fireEvent.click(await screen.findByText('Cancelar nota'));
    const confirmar = screen.getByText('Confirmar cancelamento');
    fireEvent.change(screen.getByPlaceholderText(/Motivo do cancelamento/), {
      target: { value: 'errei' },
    });
    expect(confirmar).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Motivo do cancelamento/), {
      target: { value: 'Cliente desistiu da compra' },
    });
    expect(confirmar).not.toBeDisabled();
  });

  it('só oferece NF-e depois que o cliente é identificado', async () => {
    mocked.consultarNfce.mockResolvedValue({ habilitado: true, documentos: [] } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    const campo = await screen.findByPlaceholderText(/obrigatório na NF-e/i);
    // sem documento: NF-e não aparece, e a tela diz o porquê
    expect(screen.queryByText('Emitir NF-e (empresa)')).not.toBeInTheDocument();
    expect(screen.getByText(/Informe o CNPJ do cliente/)).toBeInTheDocument();

    fireEvent.change(campo, { target: { value: '11.222.333/0001-81' } });
    expect(screen.getByText('Emitir NF-e (empresa)')).toBeInTheDocument();
  });

  it('emite NF-e com modelo 55 e o CNPJ digitado', async () => {
    mocked.consultarNfce.mockResolvedValue({ habilitado: true, documentos: [] } as never);
    mocked.emitirNfce.mockResolvedValue({ id: 'b', modelo: '55', status: 'authorized' } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    const campo = await screen.findByPlaceholderText(/obrigatório na NF-e/i);
    fireEvent.change(campo, { target: { value: '11.222.333/0001-81' } });
    fireEvent.click(screen.getByText('Emitir NF-e (empresa)'));
    await waitFor(() =>
      expect(mocked.emitirNfce).toHaveBeenCalledWith(
        '1', { modelo: '55', cpf: '11.222.333/0001-81' }, 'loja',
      ),
    );
  });

  it('mostra NFC-e e NF-e do mesmo pedido lado a lado', async () => {
    mocked.consultarNfce.mockResolvedValue({
      habilitado: true,
      documentos: [
        { id: 'a', modelo: '65', status: 'authorized', numero: '10', serie: '1' },
        { id: 'b', modelo: '55', status: 'authorized', numero: '4', serie: '1' },
      ],
    } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    expect(await screen.findByText('NFC-e')).toBeInTheDocument();
    expect(screen.getByText('NF-e')).toBeInTheDocument();
    // as duas já existem: nada mais a emitir
    expect(screen.queryByText('Emitir NFC-e (consumidor)')).not.toBeInTheDocument();
  });

  it('mostra o motivo da rejeição e deixa tentar de novo', async () => {
    mocked.consultarNfce.mockResolvedValue({
      habilitado: true,
      documentos: [{
        id: 'a', modelo: '65', status: 'rejected',
        error_message: 'Rejeicao: CPF do destinatario invalido',
      }],
    } as never);
    render(<NotaFiscalPedido orderId="1" storeSlug="loja" />);
    expect(await screen.findByText(/CPF do destinatario invalido/)).toBeInTheDocument();
    expect(screen.getByText('Tentar de novo')).toBeInTheDocument();
  });
});
