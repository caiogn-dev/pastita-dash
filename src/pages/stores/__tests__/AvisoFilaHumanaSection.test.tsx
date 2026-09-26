/**
 * "Avisar no WhatsApp quando alguém espera atendente" — opt-in, desligado
 * por padrão. Grava `metadata.aviso_fila_humana = {ativo, apos_minutos,
 * telefone}` pelo PATCH da loja, levando junto o resto do metadata (o backend
 * substitui o metadata inteiro).
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const salvarLoja = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  updateStore: (...a: unknown[]) => salvarLoja(...a),
}));

import AvisoFilaHumanaSection from '../AvisoFilaHumanaSection';
import { useRootStore } from '../../../stores/rootStore';

const LOJA = { id: 's1', slug: 'loja-x', metadata: { google_review_url: 'https://g.page/x' } };

beforeEach(() => {
  jest.clearAllMocks();
  act(() => useRootStore.getState().setStores([LOJA as never]));
});

const interruptor = () => screen.getByRole('switch', { name: /avisar no whatsapp/i });

it('sem preferência gravada, começa desligado e explica o que faz', () => {
  render(<AvisoFilaHumanaSection loja={LOJA} />);
  expect(interruptor()).toHaveAttribute('aria-checked', 'false');
  expect(screen.getByText(/você recebe uma mensagem pelo whatsapp da loja quando um cliente fica esperando mais que este tempo/i)).toBeInTheDocument();
});

it('lê o que já estava gravado', () => {
  render(<AvisoFilaHumanaSection loja={{ ...LOJA, metadata: { aviso_fila_humana: { ativo: true, apos_minutos: 7, telefone: '63999990000' } } }} />);
  expect(interruptor()).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByLabelText(/depois de quantos minutos/i)).toHaveValue(7);
  expect(screen.getByLabelText(/telefone que recebe o aviso/i)).toHaveValue('63999990000');
});

it('ligar e salvar grava no metadata sem apagar o resto', async () => {
  const salva = { ...LOJA, metadata: { ...LOJA.metadata, aviso_fila_humana: { ativo: true, apos_minutos: 10, telefone: '63999990000' } } };
  salvarLoja.mockResolvedValue(salva);
  const onSalvo = jest.fn();
  render(<AvisoFilaHumanaSection loja={LOJA} onSalvo={onSalvo} />);

  fireEvent.click(interruptor());
  fireEvent.change(screen.getByLabelText(/telefone que recebe o aviso/i), { target: { value: '(63) 99999-0000' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar aviso/i }));

  await waitFor(() => expect(salvarLoja).toHaveBeenCalledWith('s1', {
    metadata: {
      google_review_url: 'https://g.page/x',
      aviso_fila_humana: { ativo: true, apos_minutos: 10, telefone: '63999990000' },
    },
  }));
  await waitFor(() => expect(onSalvo).toHaveBeenCalledWith(salva));
  expect(useRootStore.getState().stores[0].metadata).toMatchObject({ aviso_fila_humana: { ativo: true } });
});

it('ligado sem telefone não salva e diz o que falta', async () => {
  render(<AvisoFilaHumanaSection loja={LOJA} />);

  fireEvent.click(interruptor());
  fireEvent.click(screen.getByRole('button', { name: /salvar aviso/i }));

  expect(await screen.findByText(/informe o telefone/i)).toBeInTheDocument();
  expect(salvarLoja).not.toHaveBeenCalled();
});

it('erro ao salvar fica escrito na tela', async () => {
  salvarLoja.mockRejectedValue(new Error('500'));
  render(<AvisoFilaHumanaSection loja={{ ...LOJA, metadata: { aviso_fila_humana: { ativo: true, apos_minutos: 5, telefone: '63999990000' } } }} />);

  fireEvent.click(screen.getByRole('button', { name: /salvar aviso/i }));

  expect(await screen.findByText(/não consegui salvar/i)).toBeInTheDocument();
});
