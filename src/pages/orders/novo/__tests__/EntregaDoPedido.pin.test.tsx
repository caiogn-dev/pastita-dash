/**
 * O pin do WhatsApp é o PRIMEIRO cartão do endereço, com o endereço e há quanto
 * tempo chegou. Antes era um botão só com ícone ao lado do campo — o operador
 * não achou e colou o link do Maps (Cê, 26/11).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { EntregaDoPedido } from '../EntregaDoPedido';
import type { NewOrderWizard } from '../../../../components/orders/newOrder/useNewOrderWizard';

jest.mock('../../../../components/orders/agendamento/SeletorDeFaixa', () => ({ SeletorDeFaixa: () => null }));

const PIN = {
  lat: -10.180000, lng: -48.330000,
  address: 'Quadra 100 Sul, Alameda 1, 10 - Palmas - TO',
  shared_at: new Date(Date.now() - 11 * 60_000).toISOString(),
};

const wizCom = (extra: Partial<NewOrderWizard>) => ({
  customer: { id: 'u1', name: 'Cliente Teste', phone_number: '5563900000001', total_orders: 1, total_spent: 0, addresses: [
    { id: 'a1', label: 'Casa', street: 'Rua Teste', number: '01', neighborhood: 'Casa', city: 'Palmas', state: 'TO', zip_code: '', lat: -10.18, lng: -48.36, is_default: false },
  ] },
  deliveryMethod: 'delivery',
  setDeliveryMethod: jest.fn(),
  selectedAddress: null,
  escolherEnderecoSalvo: jest.fn(),
  handleCalculateRoute: jest.fn(),
  freeAddressText: '',
  setFreeAddressText: jest.fn(),
  routeQuote: null,
  calculatingRoute: false,
  customerHasPhone: true,
  handleUseSharedLocation: jest.fn(),
  pinDoWhatsapp: null,
  usarPinDoWhatsapp: jest.fn(),
  pinEmUso: false,
  enableScheduling: false,
  setEnableScheduling: jest.fn(),
  scheduledDate: '', setScheduledDate: jest.fn(), scheduledTime: '', setScheduledTime: jest.fn(),
  storeSlug: 'ce-saladas',
  ...extra,
}) as unknown as NewOrderWizard;

it('mostra o pin do WhatsApp como primeiro cartão, com endereço e quando chegou', () => {
  render(<EntregaDoPedido wiz={wizCom({ pinDoWhatsapp: PIN })} />);

  const grupo = screen.getByRole('group', { name: 'Endereços do cliente' });
  const primeiro = grupo.querySelectorAll('button')[0];
  expect(primeiro).toHaveTextContent('Localização do WhatsApp');
  expect(primeiro).toHaveTextContent('Quadra 100 Sul, Alameda 1');
  expect(primeiro).toHaveTextContent(/há 11 min/);
});

it('tocar no cartão usa o pin', () => {
  const usar = jest.fn();
  render(<EntregaDoPedido wiz={wizCom({ pinDoWhatsapp: PIN, usarPinDoWhatsapp: usar })} />);

  fireEvent.click(screen.getByRole('button', { name: /Localização do WhatsApp/ }));
  expect(usar).toHaveBeenCalled();
});

it('cartão fica marcado quando o pin está em uso', () => {
  render(<EntregaDoPedido wiz={wizCom({ pinDoWhatsapp: PIN, pinEmUso: true })} />);

  expect(screen.getByRole('button', { name: /Localização do WhatsApp/ })).toHaveAttribute('aria-pressed', 'true');
});

it('sem pin, sem cartão', () => {
  render(<EntregaDoPedido wiz={wizCom({ pinDoWhatsapp: null })} />);

  expect(screen.queryByText('Localização do WhatsApp')).not.toBeInTheDocument();
});
