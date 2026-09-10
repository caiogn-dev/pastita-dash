/**
 * O endereço do PDV não pode crescer a cada pedido.
 *
 * Caso real da Leani (5563992618115), Cê Saladas. Os endereços salvos dela,
 * em ordem de criação no banco:
 *
 *   02/set 14:08  "Secretaria da cidadania e justiça"
 *   02/set 14:10  "Secretaria da cidadania e justiça,  — , Palmas-TO"
 *   10/set 13:19  "Secretaria da cidadania e justiça,  — , Palmas-TO,  — , Palmas-TO"
 *
 * Dois minutos entre o primeiro e o segundo: é o operador clicando no endereço
 * salvo dentro do PDV. `StepEntrega` montava um RÓTULO de exibição
 * (`${street}, ${number} — ${neighborhood}, ${city}-${state}`) e mandava esse
 * rótulo como o endereço do pedido. O servidor guarda texto solto em `street`.
 * No pedido seguinte o rótulo é montado em cima do rótulo. Catraca.
 *
 * Sobrou um `street` que não é rua nenhuma, sem número e sem CEP — e foi ele
 * que o checkout da web restaurou e reprovou em 10/set às 10:13.
 *
 * Duas regras:
 *   1. rótulo só junta pedaço que existe — nada de ",  — , ";
 *   2. endereço salvo viaja ESTRUTURADO, não como texto montado.
 */
import { rotuloDoEndereco, enderecoParaOPedido } from '../enderecoDoPedido';
import type { UserAddress } from '../../../../types/crm';

const SECIJU: UserAddress = {
  id: 'a1', label: '', street: 'Secretaria da cidadania e justiça', number: '',
  neighborhood: '', city: 'Palmas', state: 'TO', zip_code: '', lat: null, lng: null, is_default: false,
};

const COMPLETO: UserAddress = {
  id: 'a2', label: 'Casa', street: 'Avenida Juscelino Kubitscheck', number: '38-76',
  neighborhood: 'Plano Diretor Norte', city: 'Palmas', state: 'TO', zip_code: '77001014',
  lat: -10.1831388, lng: -48.3362603, is_default: true,
};

describe('rotuloDoEndereco', () => {
  it('não inventa travessão nem vírgula para pedaço que não existe', () => {
    expect(rotuloDoEndereco(SECIJU)).toBe('Secretaria da cidadania e justiça, Palmas-TO');
  });

  it('monta o rótulo inteiro quando tudo existe', () => {
    expect(rotuloDoEndereco(COMPLETO))
      .toBe('Avenida Juscelino Kubitscheck, 38-76 — Plano Diretor Norte, Palmas-TO');
  });

  it('é idempotente: passar o próprio rótulo como rua não faz crescer', () => {
    const umaVez = rotuloDoEndereco(SECIJU);
    const duasVezes = rotuloDoEndereco({ ...SECIJU, street: umaVez });
    expect(duasVezes).toBe(umaVez);
  });
});

describe('enderecoParaOPedido', () => {
  it('manda o endereço salvo ESTRUTURADO, não o rótulo', () => {
    const payload = enderecoParaOPedido({
      selectedAddress: COMPLETO,
      freeAddressText: rotuloDoEndereco(COMPLETO),
      routeCoords: null,
    });
    expect(payload).toMatchObject({
      street: 'Avenida Juscelino Kubitscheck',
      number: '38-76',
      neighborhood: 'Plano Diretor Norte',
      city: 'Palmas',
      state: 'TO',
      zip_code: '77001014',
      lat: -10.1831388,
      lng: -48.3362603,
    });
  });

  it('o street enviado nunca é o rótulo montado', () => {
    const payload = enderecoParaOPedido({
      selectedAddress: SECIJU,
      freeAddressText: rotuloDoEndereco(SECIJU),
      routeCoords: null,
    }) as { street: string };
    expect(payload.street).toBe('Secretaria da cidadania e justiça');
    expect(payload.street).not.toContain('Palmas-TO');
  });

  it('sem endereço salvo, manda o texto livre com as coordenadas', () => {
    expect(enderecoParaOPedido({
      selectedAddress: null,
      freeAddressText: '  Quadra 104 Norte, casa 3  ',
      routeCoords: { lat: -10.2, lng: -48.3 },
    })).toEqual({ lat: -10.2, lng: -48.3, raw_address: 'Quadra 104 Norte, casa 3' });
  });

  it('sem endereço salvo e sem coordenada, manda só o texto', () => {
    expect(enderecoParaOPedido({
      selectedAddress: null,
      freeAddressText: 'Quadra 104 Norte, casa 3',
      routeCoords: null,
    })).toBe('Quadra 104 Norte, casa 3');
  });

  it('a coordenada da rota vence a do endereço salvo — é a que cotou o frete', () => {
    const payload = enderecoParaOPedido({
      selectedAddress: COMPLETO,
      freeAddressText: rotuloDoEndereco(COMPLETO),
      routeCoords: { lat: -10.5, lng: -48.9 },
    });
    expect(payload).toMatchObject({ lat: -10.5, lng: -48.9 });
  });
});
