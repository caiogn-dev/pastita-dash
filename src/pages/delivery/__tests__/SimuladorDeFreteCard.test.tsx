/**
 * Simulador de taxa: o dono digita um endereço (ou cola o link do Maps) e vê
 * o que o CLIENTE vai pagar — pelo mesmo cálculo do checkout, não por uma
 * conta refeita na tela. Antes, conferir a taxa exigia abrir o cardápio e
 * fingir um pedido.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const calcular = jest.fn();
jest.mock('../../../services/orders', () => ({
  ordersService: { calculateDeliveryFee: (...a: unknown[]) => calcular(...a) },
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {},
  getErrorMessage: (e: { response?: { data?: { error?: string } } }) => e?.response?.data?.error ?? 'erro',
}));

import { SimuladorDeFreteCard, leituraDaSimulacao } from '../SimuladorDeFreteCard';

beforeEach(() => calcular.mockReset());

describe('leituraDaSimulacao', () => {
  it('dentro da área: taxa, distância e tempo', () => {
    const l = leituraDaSimulacao({ fee: 9.5, distance_km: 4.27, duration_minutes: 12, is_within_area: true }, null);
    expect(l.titulo).toBe('R$ 9,50');
    expect(l.detalhes).toEqual(['4,3 km', '12 min']);
    expect(l.fora).toBe(false);
  });

  it('fora da área não mostra preço', () => {
    const l = leituraDaSimulacao({ fee: 0, distance_km: 31, is_within_area: false }, null);
    expect(l.titulo).toBe('Fora da área de entrega');
    expect(l.fora).toBe(true);
  });

  it('taxa zero dentro da área diz Grátis', () => {
    expect(leituraDaSimulacao({ fee: 0, distance_km: 1, is_within_area: true }, null).titulo).toBe('Grátis');
  });

  it('nome da zona de preço fixo aparece', () => {
    const l = leituraDaSimulacao({ fee: 12, distance_km: 9, is_within_area: true, zone: { name: 'Taquaralto' } }, null);
    expect(l.detalhes).toContain('Taquaralto');
  });

  it('avisa a promoção quando a distância cabe no raio', () => {
    const promo = { ativo: true, ateKm: 5, pedidoMinimo: 60 };
    const l = leituraDaSimulacao({ fee: 8, distance_km: 3, is_within_area: true }, promo);
    expect(l.promo).toBe('Grátis em pedido a partir de R$ 60,00');
    expect(leituraDaSimulacao({ fee: 8, distance_km: 7, is_within_area: true }, promo).promo).toBeNull();
  });
});

describe('SimuladorDeFreteCard', () => {
  it('calcula pelo endpoint da loja e mostra o resultado', async () => {
    calcular.mockResolvedValue({ fee: 9.5, distance_km: 4.2, duration_minutes: 12, is_within_area: true });
    render(<SimuladorDeFreteCard storeSlug="agriao" metadataAtual={{}} />);
    await userEvent.type(screen.getByLabelText(/endereço/i), 'Quadra 104 Sul, Palmas');
    await userEvent.click(screen.getByRole('button', { name: /calcular/i }));
    expect(calcular).toHaveBeenCalledWith('agriao', 'Quadra 104 Sul, Palmas');
    expect(await screen.findByText('R$ 9,50')).toBeInTheDocument();
  });

  it('erro do servidor vira mensagem, não preço', async () => {
    calcular.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { error: 'Endereço não encontrado.' } } });
    render(<SimuladorDeFreteCard storeSlug="agriao" metadataAtual={{}} />);
    await userEvent.type(screen.getByLabelText(/endereço/i), 'xyz');
    await userEvent.click(screen.getByRole('button', { name: /calcular/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Endereço não encontrado.');
  });

  it('botão desligado sem endereço', () => {
    render(<SimuladorDeFreteCard storeSlug="agriao" metadataAtual={{}} />);
    expect(screen.getByRole('button', { name: /calcular/i })).toBeDisabled();
  });
});
