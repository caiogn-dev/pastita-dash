import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MelhorarComIa from '../MelhorarComIa';
import { ajudasDoCadastro } from '../../../services/ajudasDoCadastro';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  getErrorMessage: (e: { response?: { data?: { error?: string } } }) => e?.response?.data?.error ?? String(e),
}));
jest.mock('../../../hooks/useStore', () => ({ useStore: () => ({ storeSlug: 'ce-saladas' }) }));
jest.mock('../../../services/ajudasDoCadastro', () => ({
  ajudasDoCadastro: { melhorarDescricao: jest.fn() },
}));
const ajuda = ajudasDoCadastro as unknown as Record<string, jest.Mock>;

describe('MelhorarComIa', () => {
  beforeEach(() => ajuda.melhorarDescricao.mockReset());

  it('mostra a sugestão e só troca o texto quando o dono clica em Usar', async () => {
    ajuda.melhorarDescricao.mockResolvedValue({ descricao: 'Folhas e frango grelhado.', descricao_curta: 'Leve.' });
    const onUsar = jest.fn();
    render(<MelhorarComIa nome="Salada" descricao="alface" categoria="Saladas" onUsar={onUsar} />);
    fireEvent.click(screen.getByRole('button', { name: /Melhorar com IA/ }));
    await screen.findByText('Folhas e frango grelhado.');
    expect(ajuda.melhorarDescricao).toHaveBeenCalledWith('ce-saladas', { nome: 'Salada', descricao: 'alface', categoria: 'Saladas' });
    expect(onUsar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Usar' }));
    expect(onUsar).toHaveBeenCalledWith({ descricao: 'Folhas e frango grelhado.', descricao_curta: 'Leve.' });
    expect(screen.queryByTestId('sugestao-ia')).not.toBeInTheDocument();
  });

  it('IA fora do ar: mostra o motivo e o texto fica como estava', async () => {
    ajuda.melhorarDescricao.mockRejectedValue({ response: { status: 503, data: { error: 'A IA não respondeu agora.' } } });
    const onUsar = jest.fn();
    render(<MelhorarComIa nome="Salada" descricao="" onUsar={onUsar} />);
    fireEvent.click(screen.getByRole('button', { name: /Melhorar com IA/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onUsar).not.toHaveBeenCalled();
  });

  it('sem nome o botão fica travado', () => {
    render(<MelhorarComIa nome="  " descricao="" onUsar={jest.fn()} />);
    expect(screen.getByRole('button', { name: /Melhorar com IA/ })).toBeDisabled();
  });
});
