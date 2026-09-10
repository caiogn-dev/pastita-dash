/**
 * Escolher endereço salvo e digitar por cima são coisas OPOSTAS.
 *
 * Escolher: os campos do endereço passam a valer, o texto vira só rótulo.
 * Digitar: os campos deixam de valer — senão dava para escolher o salvo A,
 * digitar o B por cima e o pedido sair com rua, número e CEP do A.
 */
import { renderHook, act } from '@testing-library/react';
import { useNewOrderWizard } from '../useNewOrderWizard';
import type { UserAddress } from '../../../../types/crm';

jest.mock('../../../../services/orders', () => ({ ordersService: {} }));
jest.mock('../../../../services/api', () => ({ __esModule: true, getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : 'Erro') }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const SALVO: UserAddress = {
  id: 'a1', label: 'Trabalho', street: 'Avenida Juscelino Kubitscheck', number: '38-76',
  neighborhood: 'Plano Diretor Norte', city: 'Palmas', state: 'TO', zip_code: '77001014',
  lat: -10.1831388, lng: -48.3362603, is_default: true,
};

const montar = () => renderHook(() => useNewOrderWizard({ storeSlug: 'ce-saladas' }));

it('escolher endereço salvo guarda os campos e escreve o rótulo', () => {
  const { result } = montar();
  act(() => result.current.escolherEnderecoSalvo(SALVO));

  expect(result.current.selectedAddress).toEqual(SALVO);
  expect(result.current.freeAddressText)
    .toBe('Avenida Juscelino Kubitscheck, 38-76 — Plano Diretor Norte, Palmas-TO');
});

it('digitar por cima descarta o endereço salvo', () => {
  const { result } = montar();
  act(() => result.current.escolherEnderecoSalvo(SALVO));
  act(() => result.current.setFreeAddressText('Quadra 407 Norte, casa 2'));

  expect(result.current.selectedAddress).toBeNull();
});
