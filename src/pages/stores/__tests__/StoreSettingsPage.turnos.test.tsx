/**
 * Dois turnos e pausa programada passam pelo Salvar único da configuração.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../services/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../../../hooks', () => ({ useStore: () => ({ storeId: 'agriao', stores: [] }) }));
jest.mock('../LocalizacaoNoGoogle', () => ({ LocalizacaoNoGoogle: () => null }));

const DIA = { is_open: true, open: '08:00', close: '17:00' };
const loja = {
  id: 'uuid-1', slug: 'agriao', name: 'Agrião', email: '', phone: '', whatsapp_number: '',
  address: '', city: '', state: '', zip_code: '', latitude: null, longitude: null, status: 'active',
  metadata: { outro: 1 }, delivery_enabled: true, pickup_enabled: true,
  operating_hours: {
    monday: DIA, tuesday: DIA, wednesday: DIA, thursday: DIA, friday: DIA,
    saturday: { is_open: false, open: '08:00', close: '11:00' }, sunday: { is_open: false, open: '08:00', close: '12:00' },
  },
  prazo_entrega_min: 0, prazo_entrega_max: 0,
};
const rastreio = {
  meta_pixel_id: '', meta_pixel_enabled: false, meta_capi_enabled: false, meta_capi_access_token: '',
  meta_capi_token_configured: false, meta_capi_test_event_code: '', clarity_id: '', clarity_enabled: false,
};

jest.mock('../../../services/storesApi', () => ({
  getStore: jest.fn(), updateStore: jest.fn(), getStoreMetaTracking: jest.fn(), updateStoreMetaTracking: jest.fn(),
}));
import * as api from '../../../services/storesApi';
import { toast } from 'react-hot-toast';
import { StoreSettingsPage } from '../StoreSettingsPage';

const abrir = async () => {
  render(<MemoryRouter initialEntries={['/stores/agriao/settings']}><StoreSettingsPage /></MemoryRouter>);
  await screen.findByLabelText('Nome da loja');
  fireEvent.click(screen.getByRole('tab', { name: /Horários/i }));
};

beforeEach(() => {
  jest.clearAllMocks();
  (api.getStore as jest.Mock).mockResolvedValue(loja);
  (api.getStoreMetaTracking as jest.Mock).mockResolvedValue(rastreio);
  (api.updateStore as jest.Mock).mockResolvedValue(loja);
});

it('segundo turno na segunda, copiado para os dias abertos, grava intervals', async () => {
  await abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar turno em Segunda' }));
  fireEvent.change(screen.getByLabelText('Segunda: fecha (turno 1)'), { target: { value: '13:00' } });
  fireEvent.change(screen.getByLabelText('Segunda: abre (turno 2)'), { target: { value: '15:00' } });
  fireEvent.change(screen.getByLabelText('Segunda: fecha (turno 2)'), { target: { value: '17:00' } });
  fireEvent.click(screen.getByRole('button', { name: /Copiar horário de Segunda/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

  await waitFor(() => expect(api.updateStore).toHaveBeenCalledTimes(1));
  const [, payload] = (api.updateStore as jest.Mock).mock.calls[0];
  const turnos = [{ open: '08:00', close: '13:00' }, { open: '15:00', close: '17:00' }];
  expect(payload.operating_hours.monday.intervals).toEqual(turnos);
  expect(payload.operating_hours.friday.intervals).toEqual(turnos);
  expect(payload.operating_hours.saturday).toEqual(loja.operating_hours.saturday);
});

it('turno cruzado não grava', async () => {
  await abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar turno em Segunda' }));
  fireEvent.change(screen.getByLabelText('Segunda: abre (turno 2)'), { target: { value: '12:00' } });
  fireEvent.change(screen.getByLabelText('Segunda: fecha (turno 2)'), { target: { value: '18:00' } });
  expect(screen.getByRole('alert')).toHaveTextContent('Os turnos se sobrepõem.');
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  expect(api.updateStore).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalled();
});

it('pausa programada vai para metadata.pausas sem apagar o resto', async () => {
  await abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar pausa' }));
  fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2099-10-23T10:00' } });
  fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2099-10-23T14:00' } });
  fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Inventário' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

  await waitFor(() => expect(api.updateStore).toHaveBeenCalledTimes(1));
  const [, payload] = (api.updateStore as jest.Mock).mock.calls[0];
  expect(payload.metadata).toEqual({
    outro: 1,
    pausas: [{ inicio: '2099-10-23T10:00:00-03:00', fim: '2099-10-23T14:00:00-03:00', motivo: 'Inventário' }],
  });
});
