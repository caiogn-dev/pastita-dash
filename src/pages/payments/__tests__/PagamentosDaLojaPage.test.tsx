/**
 * Configurações → Pagamentos (26/10). O item do menu se chamava "Pagamentos"
 * e abria um EXTRATO; conectar o Mercado Pago, vale e acréscimo moravam
 * escondidos em Geral → Recebimento. Agora o item configura como a loja
 * recebe, e o extrato virou Financeiro → Pagamentos recebidos.
 *
 * Vale, vale por QR Code e acréscimo gravam cada um no seu endpoint, mas
 * entram na mesma barra e no mesmo Salvar (20/10).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../services/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../../../hooks', () => ({ useStore: () => ({ storeId: 'ce-saladas', stores: [] }) }));
jest.mock('../../stores/RecebimentoSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../../stores/VoucherSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../../stores/CaixaDinheiroSection', () => ({ __esModule: true, default: () => null }));
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
import { PagamentosDaLojaPage } from '../PagamentosDaLojaPage';

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/stores/ce-saladas/payments']}>
      <Routes><Route path="/stores/:storeId/payments" element={<PagamentosDaLojaPage />} /></Routes>
    </MemoryRouter>
  );

const barra = () => screen.queryByRole('region', { name: /alterações não salvas/i });

beforeEach(() => {
  jest.clearAllMocks();
  (api.getStore as jest.Mock).mockResolvedValue(loja);
  (api.getStoreMetaTracking as jest.Mock).mockResolvedValue({});
  (api.updateStore as jest.Mock).mockResolvedValue(loja);
});

describe('Configurações → Pagamentos: um Salvar para tudo', () => {
  it('acréscimo + bandeira: um Salvar grava os dois, sem botão por seção', async () => {
    montar();
    const acrescimo = await screen.findByLabelText('Acréscimo (%)');
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();

    fireEvent.change(acrescimo, { target: { value: '5' } });
    fireEvent.click(await screen.findByLabelText('Volus'));
    expect(barra()).toHaveTextContent('2 alterações');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.updateStore).toHaveBeenCalledTimes(2));
    const payloads = (api.updateStore as jest.Mock).mock.calls.map(([, p]) => p);
    expect(payloads).toEqual(expect.arrayContaining([
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
