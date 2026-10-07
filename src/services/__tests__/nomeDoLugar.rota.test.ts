/**
 * 02/10: o pedido do WhatsApp ficava "Localização enviada (-10.18, -48.32)".
 * nomeDoLugar chamava /stores/maps/reverse-geocode/ — rota que não existe (404)
 * — e o catch devolvia null em silêncio. A rota certa é /maps/reverse-geocode/.
 */
jest.mock('../api', () => ({ __esModule: true, default: { get: jest.fn() }, normalizePaginatedEnvelope: (x: unknown) => x }));

import api from '../api';
import { ordersService } from '../orders';

describe('nomeDoLugar', () => {
  it('chama a rota que existe e monta o endereço', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { street: 'Q. 106 Norte Alameda 10', number: '2', neighborhood: 'Plano Diretor Norte', city: 'Palmas', state_code: 'TO' } });
    const nome = await ordersService.nomeDoLugar(-10.18, -48.32);
    expect((api.get as jest.Mock).mock.calls[0][0]).toBe('/maps/reverse-geocode/');
    expect(nome).toBe('Q. 106 Norte Alameda 10, 2 — Plano Diretor Norte, Palmas-TO');
  });
});
