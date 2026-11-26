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
jest.mock('../../stores/RecebimentoSection', () => ({ __esModule: true, default: () => <h2>Onde o dinheiro cai</h2> }));
jest.mock('../../stores/VoucherSection', () => ({
  __esModule: true,
  // Só o que a página decide: onde a config do vale aparece e se aparece.
  default: ({ interruptor }: { interruptor?: { ligada: boolean } }) =>
    (interruptor && !interruptor.ligada ? null : <p>Config do vale</p>),
}));
jest.mock('../../stores/CaixaDinheiroSection', () => ({ __esModule: true, default: () => <h2>Caixa</h2> }));
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
  getFormasDePagamento: jest.fn(),
  updateFormasDePagamento: jest.fn(),
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

const FORMAS = [
  { metodo: 'pix', rotulo: 'PIX', disponivel: true, ligada: true },
  { metodo: 'voucher', rotulo: 'Vale-refeição no cardápio', disponivel: true, ligada: true },
  { metodo: 'voucher_link', rotulo: 'Vale-refeição por link', disponivel: true, ligada: true },
];

const comFormas = (formas: typeof FORMAS) =>
  (api.getFormasDePagamento as jest.Mock).mockResolvedValue({ formas });

beforeEach(() => {
  jest.clearAllMocks();
  comFormas(FORMAS);
  (api.updateFormasDePagamento as jest.Mock).mockResolvedValue({ formas: FORMAS });
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

describe('Configurações → Pagamentos: hierarquia', () => {
  it('ordem: como o cliente paga → onde o dinheiro cai → acréscimo do vale → caixa', async () => {
    montar();
    await screen.findByLabelText('Acréscimo (%)');
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual(['Como o cliente paga', 'Onde o dinheiro cai', 'Acréscimo do vale', 'Caixa']);
  });

  it('o vale liga num lugar só: a linha da forma, sem cartão de vale separado', async () => {
    montar();
    expect(await screen.findByRole('switch', { name: 'Vale-refeição no cardápio' })).toBeInTheDocument();
    expect(screen.getAllByText('Config do vale')).toHaveLength(1);
    expect(screen.queryByLabelText(/aceitar vale/i)).toBeNull();
  });

  it('vale desligado: a config do vale some e o acréscimo também', async () => {
    comFormas([
      FORMAS[0],
      { ...FORMAS[1], ligada: false },
      { ...FORMAS[2], ligada: false },
    ]);
    montar();
    await screen.findByRole('switch', { name: 'PIX' });
    expect(screen.queryByText('Config do vale')).toBeNull();
    expect(screen.queryByLabelText('Volus')).toBeNull();
    expect(screen.queryByLabelText('Acréscimo (%)')).toBeNull();
  });

  it('desligar o vale vai pela barra e grava no mesmo Salvar', async () => {
    montar();
    fireEvent.click(await screen.findByRole('switch', { name: 'Vale-refeição no cardápio' }));
    expect(screen.queryByText('Config do vale')).toBeNull();
    expect(api.updateFormasDePagamento).not.toHaveBeenCalled();
    expect(barra()).toHaveTextContent('1 alteração');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.updateFormasDePagamento).toHaveBeenCalledWith('uuid-1', ['voucher']));
    // Depois do Salvar, a disponibilidade é buscada de novo.
    await waitFor(() => expect(api.getFormasDePagamento).toHaveBeenCalledTimes(2));
  });
});
