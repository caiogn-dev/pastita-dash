/**
 * Entrega numa tela só (26/10). Ligar entrega/retirada e o prazo moravam em
 * Configurações → Geral; o preço, aqui; o pedido mínimo, só na criação da loja.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../services/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../../../services/storesApi', () => ({ getStore: jest.fn(), updateStore: jest.fn() }));
import * as api from '../../../services/storesApi';
import { toast } from 'react-hot-toast';
import { ComoOClienteRecebe } from '../ComoOClienteRecebe';

const loja = {
  id: 'uuid-1', slug: 'ce', delivery_enabled: true, pickup_enabled: true,
  prazo_entrega_min: 30, prazo_entrega_max: 45, min_order_value: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  (api.getStore as jest.Mock).mockResolvedValue(loja);
  (api.updateStore as jest.Mock).mockImplementation((_s, p) => Promise.resolve({ ...loja, ...p }));
});

it('mostra entrega, retirada, prazo e pedido mínimo da loja', async () => {
  render(<ComoOClienteRecebe loja="ce" />);
  expect(await screen.findByRole('switch', { name: 'Entrega' })).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Retirada no balcão' })).toBeInTheDocument();
  expect(screen.getByLabelText('Prazo mínimo')).toHaveValue(30);
  expect(screen.getByLabelText('Pedido mínimo')).toBeInTheDocument();
  // Nada mudou: nada a salvar.
  expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
});

it('prazo e pedido mínimo gravam juntos num Salvar', async () => {
  render(<ComoOClienteRecebe loja="ce" />);
  fireEvent.change(await screen.findByLabelText('Prazo máximo'), { target: { value: '50' } });
  fireEvent.change(screen.getByLabelText('Pedido mínimo'), { target: { value: '2500' } }); // enche pelos centavos
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(api.updateStore).toHaveBeenCalledWith('ce', {
    prazo_entrega_min: 30, prazo_entrega_max: 50, min_order_value: 25,
  }));
});

it('prazo invertido não grava', async () => {
  render(<ComoOClienteRecebe loja="ce" />);
  fireEvent.change(await screen.findByLabelText('Prazo mínimo'), { target: { value: '60' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  expect(await screen.findByText('O mínimo não pode passar do máximo.')).toBeInTheDocument();
  expect(api.updateStore).not.toHaveBeenCalled();
});

it('desligar a entrega grava na hora', async () => {
  render(<ComoOClienteRecebe loja="ce" />);
  fireEvent.click(await screen.findByRole('switch', { name: 'Entrega' }));
  await waitFor(() => expect(api.updateStore).toHaveBeenCalledWith('ce', { delivery_enabled: false, pickup_enabled: true }));
  expect(toast.success).toHaveBeenCalled();
});
