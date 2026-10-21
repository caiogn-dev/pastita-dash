/**
 * Vale, vale por QR Code, acréscimo e nota fiscal gravam fora da loja, mas
 * entram na mesma barra e no mesmo Salvar (20/10). Antes cada um tinha o seu
 * botão: mexia-se em dois, salvava-se um, e o outro se perdia ao sair da aba.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../services/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../../../hooks', () => ({ useStore: () => ({ storeId: 'ce-saladas', stores: [] }) }));
jest.mock('../LocalizacaoNoGoogle', () => ({ LocalizacaoNoGoogle: () => null }));
jest.mock('../RecebimentoSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../VoucherSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../NotaFiscalSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../CaixaDinheiroSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../AvisoFilaHumanaSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../services/payments', () => ({
  paymentsService: {
    getVoucherBrands: jest.fn().mockResolvedValue({ manual_brands: [{ value: 'volus', label: 'Volus' }] }),
  },
}));

const loja = {
  id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas', email: '', phone: '', whatsapp_number: '63999990000',
  address: '', city: '', state: '', zip_code: '', latitude: null, longitude: null, status: 'active',
  metadata: {}, delivery_enabled: true, pickup_enabled: true, operating_hours: {},
  prazo_entrega_min: 0, prazo_entrega_max: 0, default_prep_minutes: 0,
  voucher_fee_percent: 0, vale_por_link_brands: [],
};

jest.mock('../../../services/storesApi', () => ({
  getStore: jest.fn(),
  updateStore: jest.fn(),
  getStoreMetaTracking: jest.fn(),
  updateStoreMetaTracking: jest.fn(),
}));
import * as api from '../../../services/storesApi';
import { toast } from 'react-hot-toast';
import { StoreSettingsPage } from '../StoreSettingsPage';

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/stores/ce-saladas/settings?aba=recebimento']}>
      <StoreSettingsPage />
    </MemoryRouter>
  );

const barra = () => screen.queryByRole('region', { name: /alterações não salvas/i });

beforeEach(() => {
  jest.clearAllMocks();
  (api.getStore as jest.Mock).mockResolvedValue(loja);
  (api.getStoreMetaTracking as jest.Mock).mockResolvedValue({});
  (api.updateStore as jest.Mock).mockResolvedValue(loja);
});

describe('Configurações: seções de fora da loja no salvar único', () => {
  it('acréscimo + bandeira + nome: um Salvar grava os três, sem botão por seção', async () => {
    montar();
    const acrescimo = await screen.findByLabelText('Acréscimo (%)');
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();

    fireEvent.change(acrescimo, { target: { value: '5' } });
    fireEvent.click(await screen.findByLabelText('Volus'));
    expect(barra()).toHaveTextContent('2 alterações');
    expect(screen.getByRole('tab', { name: /Recebimento.*alterado/i })).toBeInTheDocument();

    // Trocar de aba não joga fora o que foi digitado.
    fireEvent.click(screen.getByRole('tab', { name: /^Loja/i }));
    fireEvent.change(screen.getByLabelText('Nome da loja'), { target: { value: 'Cê' } });
    expect(barra()).toHaveTextContent('3 alterações');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.updateStore).toHaveBeenCalledTimes(3));
    const payloads = (api.updateStore as jest.Mock).mock.calls.map(([, p]) => p);
    expect(payloads).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Cê' }),
      { voucher_fee_percent: 5 },
      { vale_por_link_brands: ['volus'] },
    ]));
  });

  it('acréscimo inválido não grava nada e mostra onde', async () => {
    montar();
    fireEvent.change(await screen.findByLabelText('Acréscimo (%)'), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Use um número entre 0 e 100.')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Use um número entre 0 e 100.');
    expect(api.updateStore).not.toHaveBeenCalled();
  });

  it('descartar volta o acréscimo e a bandeira', async () => {
    montar();
    const acrescimo = await screen.findByLabelText('Acréscimo (%)');
    fireEvent.change(acrescimo, { target: { value: '5' } });
    const volus = await screen.findByLabelText('Volus');
    fireEvent.click(volus);
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(acrescimo).toHaveValue('');
    expect(volus).not.toBeChecked();
    expect(barra()).toBeNull();
  });
});
