/**
 * Reajuste de preço em massa (06/10, visto no Prefiro): escolher itens,
 * somar ou reduzir em R$ ou %, ver a prévia, aplicar e poder desfazer.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
const reajustar = jest.fn();
const desfazer = jest.fn();
jest.mock('../../../../services/reajusteDePreco', () => ({
  __esModule: true,
  reajusteDePrecoService: { reajustar: (...a: unknown[]) => reajustar(...a), desfazer: (...a: unknown[]) => desfazer(...a) },
}));

jest.mock('../../../../services/api', () => ({
  __esModule: true,
  getErrorMessage: (e: { message?: string }) => e?.message || 'erro',
}));

import { ReajusteDePrecoModal } from '../ReajusteDePrecoModal';

const PRODUTOS = [
  { id: 'p1', name: 'Queridinha', price: 36.99, category: 'c1' },
  { id: 'p2', name: 'Suco de Laranja', price: 9.9, category: 'c2' },
] as never[];
const CATEGORIAS = [{ id: 'c1', name: 'Saladas' }, { id: 'c2', name: 'Bebidas' }] as never[];

const abrir = (props: Partial<React.ComponentProps<typeof ReajusteDePrecoModal>> = {}) => render(
  <ReajusteDePrecoModal isOpen loja="ce-saladas" produtos={PRODUTOS} categorias={CATEGORIAS}
    onClose={jest.fn()} onAplicado={jest.fn()} {...props} />,
);

beforeEach(() => jest.clearAllMocks());

it('prévia manda os itens escolhidos e mostra antes → depois', async () => {
  reajustar.mockResolvedValue({ aplicado: false, itens: [
    { id: 'p1', nome: 'Queridinha', antes: '36.99', depois: '40.69', avisos: [], variantes: [] },
  ] });
  abrir();
  fireEvent.click(screen.getByRole('checkbox', { name: /queridinha/i }));
  fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
  await waitFor(() => expect(reajustar).toHaveBeenCalledWith({
    store: 'ce-saladas', operacao: 'acrescentar', modo: 'percentual', valor: '10', produtos: ['p1'], previa: true,
  }));
  expect(await screen.findByText(/R\$ 36,99 → R\$ 40,69/)).toBeInTheDocument();
});

it('selecionar a categoria inteira marca os produtos dela', () => {
  abrir();
  fireEvent.click(screen.getByRole('checkbox', { name: /^bebidas/i }));
  expect(screen.getByRole('checkbox', { name: /suco de laranja/i })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: /queridinha/i })).not.toBeChecked();
});

it('aplicar grava e avisa quem chamou', async () => {
  const onAplicado = jest.fn();
  reajustar
    .mockResolvedValueOnce({ aplicado: false, itens: [{ id: 'p1', nome: 'Queridinha', antes: '36.99', depois: '40.69', avisos: [], variantes: [] }] })
    .mockResolvedValueOnce({ aplicado: true, itens: [{ id: 'p1', nome: 'Queridinha', antes: '36.99', depois: '40.69', avisos: [], variantes: [] }] });
  abrir({ onAplicado });
  fireEvent.click(screen.getByRole('checkbox', { name: /queridinha/i }));
  fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
  fireEvent.click(await screen.findByRole('button', { name: /aplicar/i }));
  await waitFor(() => expect(reajustar).toHaveBeenLastCalledWith(expect.objectContaining({ previa: false })));
  await waitFor(() => expect(onAplicado).toHaveBeenCalled());
});

it('preço que ficaria zerado: mostra quais itens travaram', async () => {
  reajustar.mockRejectedValue({ response: { status: 400, data: {
    error: 'Alguns preços ficariam zerados ou negativos.', recusados: [{ id: 'p2', nome: 'Suco de Laranja', antes: '9.90' }],
  } } });
  abrir();
  fireEvent.click(screen.getByRole('checkbox', { name: /suco de laranja/i }));
  fireEvent.click(screen.getByRole('button', { name: /reduzir/i }));
  fireEvent.click(screen.getByRole('button', { name: /^r\$$/i }));
  fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
  const alerta = await screen.findByRole('alert');
  expect(within(alerta).getByText(/suco de laranja/i)).toBeInTheDocument();
});

it('sem item escolhido não deixa pedir prévia', () => {
  abrir();
  fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '10' } });
  expect(screen.getByRole('button', { name: /ver prévia/i })).toBeDisabled();
});
