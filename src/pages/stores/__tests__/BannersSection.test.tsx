import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const listar = jest.fn();
const subir = jest.fn();
const apagar = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  MAXIMO_DE_BANNERS: 3,
  listarBanners: (...a: unknown[]) => listar(...a),
  subirBanner: (...a: unknown[]) => subir(...a),
  apagarBanner: (...a: unknown[]) => apagar(...a),
}));

import BannersSection from '../BannersSection';

const b = (n: number) => ({ id: `b${n}`, url: `https://x/${n}.jpg`, position: n });

beforeEach(() => {
  jest.clearAllMocks();
  listar.mockResolvedValue([]);
  subir.mockResolvedValue(b(9));
  apagar.mockResolvedValue(undefined);
});

describe('BannersSection', () => {
  it('mostra os banners que a loja já tem e a contagem', async () => {
    listar.mockResolvedValue([b(0), b(1)]);
    render(<BannersSection storeId="s1" />);
    expect(await screen.findByAltText('Banner 1')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('com 3 banners some o botão de adicionar', async () => {
    listar.mockResolvedValue([b(0), b(1), b(2)]);
    render(<BannersSection storeId="s1" />);
    await screen.findByAltText('Banner 3');
    expect(screen.queryByRole('button', { name: /adicionar banner/i })).not.toBeInTheDocument();
  });

  it('escolher uma imagem sobe e aparece na lista', async () => {
    render(<BannersSection storeId="s1" />);
    await screen.findByRole('button', { name: /adicionar banner/i });
    const arquivo = new File(['x'], 'promo.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Arquivo do banner'), { target: { files: [arquivo] } });
    await waitFor(() => expect(subir).toHaveBeenCalledWith('s1', arquivo));
    expect(await screen.findByAltText('Banner 1')).toBeInTheDocument();
  });

  it('arquivo que não é imagem é recusado sem chamar a API', async () => {
    render(<BannersSection storeId="s1" />);
    await screen.findByRole('button', { name: /adicionar banner/i });
    const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Arquivo do banner'), { target: { files: [pdf] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/imagem/i);
    expect(subir).not.toHaveBeenCalled();
  });

  it('apagar remove da lista e chama a API', async () => {
    listar.mockResolvedValue([b(0)]);
    render(<BannersSection storeId="s1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Apagar banner 1' }));
    await waitFor(() => expect(apagar).toHaveBeenCalledWith('s1', 'b0'));
    expect(screen.queryByAltText('Banner 1')).not.toBeInTheDocument();
  });

  it('erro do servidor (ex.: limite) aparece na tela', async () => {
    subir.mockRejectedValue({ response: { data: { error: 'O cardápio aceita até 3 banners.' } } });
    render(<BannersSection storeId="s1" />);
    await screen.findByRole('button', { name: /adicionar banner/i });
    fireEvent.change(screen.getByLabelText('Arquivo do banner'),
      { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('até 3 banners');
  });
});
