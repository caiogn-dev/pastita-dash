/**
 * Configurações da loja com UM salvar (14/10). Eram cinco botões "Salvar …"
 * na página — mexia-se no horário e no nome, salvava-se um, e o outro se
 * perdia ao trocar de aba. Agora a barra de alterações junta tudo.
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../services/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../../../hooks', () => ({ useStore: () => ({ storeId: 'ce-saladas', stores: [] }) }));
jest.mock('../LocalizacaoNoGoogle', () => ({ LocalizacaoNoGoogle: () => null }));
jest.mock('../RecebimentoSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../VoucherSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ValePorLinkSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../AcrescimoDoValeSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../NotaFiscalSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../CaixaDinheiroSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../AvisoFilaHumanaSection', () => ({ __esModule: true, default: () => null }));

const loja = {
  id: 'uuid-1',
  slug: 'ce-saladas',
  name: 'Cê Saladas',
  email: 'oi@ce.com',
  phone: '6333334444',
  whatsapp_number: '63999547790',
  address: 'Rua 1',
  city: 'Palmas',
  state: 'TO',
  zip_code: '77000000',
  latitude: -10.2,
  longitude: -48.3,
  status: 'active',
  metadata: { google_review_url: '', outro: 1 },
  delivery_enabled: true,
  pickup_enabled: true,
  operating_hours: {},
  prazo_entrega_min: 0,
  prazo_entrega_max: 0,
  default_prep_minutes: 20,
};

const rastreio = {
  meta_pixel_id: '', meta_pixel_enabled: false, meta_capi_enabled: false,
  meta_capi_access_token: '', meta_capi_token_configured: false, meta_capi_test_event_code: '',
  clarity_id: '', clarity_enabled: false,
};

jest.mock('../../../services/storesApi', () => ({
  getStore: jest.fn(),
  updateStore: jest.fn(),
  getStoreMetaTracking: jest.fn(),
  updateStoreMetaTracking: jest.fn(),
}));
import * as api from '../../../services/storesApi';
import { StoreSettingsPage } from '../StoreSettingsPage';

const montar = (url = '/stores/ce-saladas/settings') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <StoreSettingsPage />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  (api.getStore as jest.Mock).mockResolvedValue(loja);
  (api.getStoreMetaTracking as jest.Mock).mockResolvedValue(rastreio);
  (api.updateStore as jest.Mock).mockResolvedValue(loja);
  (api.updateStoreMetaTracking as jest.Mock).mockResolvedValue(rastreio);
});

describe('Configurações: um salvar só', () => {
  it('nenhum botão "Salvar …" por bloco, e a barra só aparece quando algo muda', async () => {
    montar();
    const nome = await screen.findByLabelText('Nome da loja');
    expect(screen.queryByRole('button', { name: /^Salvar /i })).toBeNull();
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).toBeNull();
    fireEvent.change(nome, { target: { value: 'Cê Saladas Palmas' } });
    expect(screen.getByRole('region', { name: /alterações não salvas/i })).toHaveTextContent('1 alteração');
  });

  it('nome + horário + avaliação viram UMA gravação da loja, sem perder o metadata', async () => {
    montar();
    fireEvent.change(await screen.findByLabelText('Nome da loja'), { target: { value: 'Cê' } });

    fireEvent.click(screen.getByRole('tab', { name: /Entrega e horários/i }));
    fireEvent.click(screen.getByRole('button', { name: /Domingo/ }));

    fireEvent.click(screen.getByRole('tab', { name: /Avaliações/i }));
    fireEvent.change(screen.getByLabelText('Link de avaliação do Google'), {
      target: { value: ' https://g.page/r/x/review ' },
    });

    // A seção mexida e não salva fica marcada no menu.
    expect(screen.getByRole('tab', { name: /Loja.*alterado/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.updateStore).toHaveBeenCalledTimes(1));
    const [, payload] = (api.updateStore as jest.Mock).mock.calls[0];
    expect(payload.name).toBe('Cê');
    expect(payload.operating_hours.sunday.is_open).toBe(true);
    expect(payload.metadata).toEqual({ google_review_url: 'https://g.page/r/x/review', outro: 1 });
    expect(api.updateStoreMetaTracking).not.toHaveBeenCalled();
  });

  it('descartar volta tudo ao que estava salvo', async () => {
    montar();
    const nome = await screen.findByLabelText('Nome da loja');
    fireEvent.change(nome, { target: { value: 'Outro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(nome).toHaveValue('Cê Saladas');
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).toBeNull();
  });

  it('latitude inválida não grava nada e diz onde está o erro', async () => {
    montar();
    fireEvent.change(await screen.findByLabelText('Latitude'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/entre -90 e 90/i)).toBeInTheDocument();
    expect(api.updateStore).not.toHaveBeenCalled();
  });

  it('rastreamento mexido grava só o rastreamento', async () => {
    montar('/stores/ce-saladas/settings?aba=rastreamento');
    fireEvent.change(await screen.findByLabelText('Número do Pixel'), { target: { value: '12a3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.updateStoreMetaTracking).toHaveBeenCalledTimes(1));
    expect((api.updateStoreMetaTracking as jest.Mock).mock.calls[0][1].meta_pixel_id).toBe('123');
    expect(api.updateStore).not.toHaveBeenCalled();
  });

  // 14/10: o cliente via "~3 min" (trajeto) e reclamava de demora dentro do
  // prazo. O dono define a faixa que o cliente vê ("30–45 min").
  it('prazo de entrega para o cliente entra no mesmo salvar', async () => {
    montar('/stores/ce-saladas/settings?aba=entrega');
    fireEvent.change(await screen.findByLabelText('Prazo mínimo'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Prazo máximo'), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.updateStore).toHaveBeenCalledTimes(1));
    expect((api.updateStore as jest.Mock).mock.calls[0][1]).toMatchObject({ prazo_entrega_min: 30, prazo_entrega_max: 45 });
  });

  it('prazo invertido não grava', async () => {
    montar('/stores/ce-saladas/settings?aba=entrega');
    fireEvent.change(await screen.findByLabelText('Prazo mínimo'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Prazo máximo'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/mínimo não pode passar do máximo/i)).toBeInTheDocument();
    expect(api.updateStore).not.toHaveBeenCalled();
  });

  // 20/10: o tempo de preparo tinha um "Salvar" só dele no meio da aba —
  // o único bloco da página fora da barra de alterações.
  it('tempo de preparo entra no mesmo salvar', async () => {
    montar('/stores/ce-saladas/settings?aba=entrega');
    const campo = await screen.findByLabelText('Tempo padrão');
    expect(campo).toHaveValue(20);
    fireEvent.change(campo, { target: { value: '35' } });
    expect(screen.getByRole('tab', { name: /Entrega.*alterado/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.updateStore).toHaveBeenCalledTimes(1));
    expect((api.updateStore as jest.Mock).mock.calls[0][1]).toEqual({ default_prep_minutes: 35 });
  });

  it('tempo de preparo acima de 600 min não grava', async () => {
    montar('/stores/ce-saladas/settings?aba=entrega');
    fireEvent.change(await screen.findByLabelText('Tempo padrão'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/0 a 600 minutos/i)).toBeInTheDocument();
    expect(api.updateStore).not.toHaveBeenCalled();
  });
});

describe('Configurações: agendamento (21/10)', () => {
  it('intervalo de 30 min entra no mesmo salvar, no metadata, sem perder o resto', async () => {
    (api.getStore as jest.Mock).mockResolvedValue({
      ...loja,
      operating_hours: { monday: { open: '08:00', close: '17:00', is_open: true } },
    });
    montar('/stores/ce-saladas/settings?aba=entrega');
    const previa = await screen.findByTestId('previa-agendamento');
    expect(previa).toHaveTextContent('16:00–17:00');
    expect(previa).not.toHaveTextContent('18:00');

    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Cada horário dura' })).getByRole('radio', { name: '30 min' }));
    expect(previa).toHaveTextContent('16:30–17:00');
    expect(screen.getByRole('region', { name: /alterações não salvas/i })).toHaveTextContent('1 alteração');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.updateStore).toHaveBeenCalledTimes(1));
    const [, payload] = (api.updateStore as jest.Mock).mock.calls[0];
    expect(payload.metadata).toEqual({ google_review_url: '', outro: 1, agendamento: { intervalo: 30, antecedencia: 60 } });
  });
});
