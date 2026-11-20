import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const get = jest.fn();
const put = jest.fn();
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) },
}));
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('../../../hooks', () => ({ useStore: () => ({ store: { slug: 'ce' } }) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));
jest.mock('../../../components/ui', () => ({
  PageShell: ({ titulo, acoes, children }: { titulo: string; acoes?: React.ReactNode; children: React.ReactNode }) => <div><h1>{titulo}</h1>{acoes}{children}</div>,
  Button: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} />,
  EmptyState: ({ titulo, descricao }: { titulo: string; descricao?: string }) => <p>{titulo} {descricao}</p>,
  Input: ({ size: _s, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { size?: string }) => <input {...p} />,
}));

import { MinhasMarcasPage } from '../MinhasMarcasPage';

const marcas = [
  { slug: 'ce', nome: 'Cê', logo_url: '', no_grupo: true, link: '' },
  { slug: 'agriao', nome: 'Agrião', logo_url: '', no_grupo: true, link: 'https://x.com/a' },
  { slug: 'kero', nome: 'Kero', logo_url: '', no_grupo: false, link: '' },
];

beforeEach(() => { get.mockReset(); put.mockReset(); });

it('lista as marcas e salva a nova ordem e quem entra', async () => {
  get.mockResolvedValue({ data: { marcas } });
  put.mockResolvedValue({ data: { marcas } });
  render(<MinhasMarcasPage />);
  expect(await screen.findByText('Agrião')).toBeInTheDocument();
  expect(get).toHaveBeenCalledWith('/stores/minhas-marcas/', { params: { store: 'ce' } });
  fireEvent.click(screen.getByLabelText('Mostrar Kero'));
  fireEvent.click(screen.getByLabelText('Subir Agrião'));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Salvar' })); });
  expect(put).toHaveBeenCalledWith('/stores/minhas-marcas/', { marcas: [
    { slug: 'agriao', no_grupo: true, link: 'https://x.com/a' },
    { slug: 'ce', no_grupo: true, link: '' },
    { slug: 'kero', no_grupo: true, link: '' },
  ] }, { params: { store: 'ce' } });
});

it('quem não é dono vê o motivo', async () => {
  get.mockRejectedValue('Só o dono da loja organiza as marcas.');
  render(<MinhasMarcasPage />);
  await waitFor(() => expect(screen.getByText(/Só o dono da loja organiza as marcas/)).toBeInTheDocument());
});
