import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DescontoRetiradaCard, gravarDescontoRetirada, lerDescontoRetirada } from '../DescontoRetiradaCard';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

it('lê e grava o bloco do metadata sem perder o resto', () => {
  const meta = { frete_gratis: { ativo: true }, desconto_retirada: { ativo: true, percentual: 20, fim: '2026-11-26T23:59:59-03:00' } };
  const d = lerDescontoRetirada(meta);
  expect(d).toEqual({ ativo: true, percentual: 20, ate: '2026-11-26' });
  expect(gravarDescontoRetirada(meta, { ...d, percentual: 15 })).toEqual({
    frete_gratis: { ativo: true },
    desconto_retirada: { ativo: true, percentual: 15, fim: '2026-11-26T23:59:59-03:00' },
  });
  expect(gravarDescontoRetirada({}, { ativo: true, percentual: 10, ate: '' })).toEqual({ desconto_retirada: { ativo: true, percentual: 10 } });
});

it('salva o percentual digitado e mostra o que o cliente vê', async () => {
  const onSalvar = jest.fn().mockResolvedValue(undefined);
  render(<DescontoRetiradaCard metadataAtual={{ desconto_retirada: { ativo: true, percentual: 20 } }} onSalvar={onSalvar} />);
  expect(screen.getByText('Retirada −20% no pedido')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Desconto'), { target: { value: '25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(onSalvar).toHaveBeenCalledWith({ desconto_retirada: { ativo: true, percentual: 25 } }));
});

it('ligado sem percentual não salva', () => {
  const onSalvar = jest.fn();
  render(<DescontoRetiradaCard metadataAtual={{ desconto_retirada: { ativo: true } }} onSalvar={onSalvar} />);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  expect(onSalvar).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
