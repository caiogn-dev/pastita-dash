import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const get = jest.fn();
jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: (...a: unknown[]) => get(...a) } }));

import { LocalizacaoNoGoogle } from '../LocalizacaoNoGoogle';

beforeEach(() => get.mockReset());

it('acha o estabelecimento pelo nome e devolve o ponto escolhido', async () => {
  get.mockResolvedValue({ data: { suggestions: [
    { main_text: 'Agrião Comida Saudável', secondary_text: 'Palmas - TO', lat: -10.21, lng: -48.33, formatted_address: 'ASR SE 15, Palmas' },
  ] } });
  const onEscolher = jest.fn();
  render(<LocalizacaoNoGoogle storeSlug="agriao" onEscolher={onEscolher} />);
  fireEvent.change(screen.getByLabelText('Buscar a loja no Google'), { target: { value: 'Agrião Comida' } });
  fireEvent.click(await screen.findByRole('option', { name: /agrião comida saudável/i }));
  expect(get).toHaveBeenCalledWith('/stores/agriao/autosuggest/', { params: { q: 'Agrião Comida', tipo: 'estabelecimento', limit: 6 } });
  expect(onEscolher).toHaveBeenCalledWith({ lat: -10.21, lng: -48.33, endereco: 'ASR SE 15, Palmas' });
});

it('link do Google Maps vira o ponto; erro do servidor aparece no campo', async () => {
  get.mockResolvedValueOnce({ data: { lat: -10.2105, lng: -48.3305 } });
  const onEscolher = jest.fn();
  render(<LocalizacaoNoGoogle storeSlug="agriao" onEscolher={onEscolher} />);
  fireEvent.change(screen.getByLabelText('Link do Google Maps'), { target: { value: 'https://maps.app.goo.gl/x' } });
  fireEvent.click(screen.getByRole('button', { name: 'Usar' }));
  await waitFor(() => expect(onEscolher).toHaveBeenCalledWith({ lat: -10.2105, lng: -48.3305 }));

  get.mockRejectedValueOnce({ response: { data: { detail: 'Cole um link do Google Maps.' } } });
  fireEvent.change(screen.getByLabelText('Link do Google Maps'), { target: { value: 'https://exemplo.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Usar' }));
  expect(await screen.findByText('Cole um link do Google Maps.')).toBeInTheDocument();
});
