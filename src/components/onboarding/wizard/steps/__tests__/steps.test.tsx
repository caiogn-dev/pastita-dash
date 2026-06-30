import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';

jest.mock('../../../../../services/storesApi', () => ({
  __esModule: true,
  updateStore: jest.fn(),
  updateStoreWithFiles: jest.fn(),
}));
jest.mock('../../../../../services/products', () => ({
  __esModule: true,
  default: { createProduct: jest.fn() },
}));
jest.mock('../../../../../services/delivery', () => ({
  __esModule: true,
  default: { createZone: jest.fn() },
}));

import StepWhatsApp from '../StepWhatsApp';
import StepProduct from '../StepProduct';
import * as storesApi from '../../../../../services/storesApi';
import productsService from '../../../../../services/products';

describe('wizard steps', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('StepWhatsApp salva o número (só dígitos) e chama onSaved', async () => {
    (storesApi.updateStore as jest.Mock).mockResolvedValue({});
    const onSaved = jest.fn();
    render(<StepWhatsApp storeId="s1" onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/whatsapp/i), { target: { value: '(63) 99999-8888' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /salvar/i })); });
    await waitFor(() => expect(storesApi.updateStore).toHaveBeenCalledWith('s1', { whatsapp_number: '6399999888' + '8' }));
    expect(onSaved).toHaveBeenCalled();
  });

  it('StepProduct cria produto com sku auto + stock default', async () => {
    (productsService.createProduct as jest.Mock).mockResolvedValue({});
    const onSaved = jest.fn();
    render(<StepProduct storeId="s1" onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Coxinha' } });
    fireEvent.change(screen.getByLabelText(/preço/i), { target: { value: '8.5' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /salvar/i })); });
    await waitFor(() => expect(productsService.createProduct).toHaveBeenCalled());
    const arg = (productsService.createProduct as jest.Mock).mock.calls[0][0];
    expect(arg.name).toBe('Coxinha');
    expect(arg.price).toBe(8.5);
    expect(arg.sku).toBeTruthy();
    expect(arg.stock_quantity).toBe(0);
    expect(onSaved).toHaveBeenCalled();
  });
});
