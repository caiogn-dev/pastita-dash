import type { UserAddress } from '../../../types/crm';
import type { Coords } from './parseCoords';

/**
 * Rótulo de EXIBIÇÃO do endereço. Só para o operador ler.
 *
 * Junta apenas os pedaços que existem. A versão antiga era um template fixo
 * (`${street}, ${number} — ${neighborhood}, ${city}-${state}`) e, com número e
 * bairro vazios, produzia "Secretaria da cidadania e justiça,  — , Palmas-TO"
 * — pontuação sem conteúdo entre ela.
 */
export const rotuloDoEndereco = (addr: Pick<UserAddress, 'street' | 'number' | 'neighborhood' | 'city' | 'state'>): string => {
  const rua = (addr.street || '').trim();
  const numero = (addr.number || '').trim();
  const bairro = (addr.neighborhood || '').trim();
  const cidade = (addr.city || '').trim();
  const uf = (addr.state || '').trim();

  const inicio = [rua, numero].filter(Boolean).join(', ');
  const comBairro = [inicio, bairro].filter(Boolean).join(' — ');
  const local = cidade && uf ? `${cidade}-${uf}` : (cidade || uf);

  // Sem esta guarda o rótulo cresce quando a rua JÁ é um rótulo antigo — foi
  // exatamente assim que o endereço da Leani ganhou um ", Palmas-TO" por pedido.
  if (local && comBairro.endsWith(local)) return comBairro;

  return [comBairro, local].filter(Boolean).join(', ');
};

export interface EntradaDoEndereco {
  selectedAddress: UserAddress | null;
  freeAddressText: string;
  routeCoords: Coords | null;
}

/**
 * O que vai no `delivery_address` do pedido.
 *
 * Com endereço salvo, viaja ESTRUTURADO: o servidor recebe rua, número, bairro,
 * cidade, UF e CEP separados e remonta o texto formatado sozinho. Mandar o
 * rótulo montado fazia o servidor guardar o rótulo inteiro dentro de `street`,
 * e o pedido seguinte montava rótulo em cima de rótulo.
 *
 * A coordenada da cotação vence a do endereço salvo: é ela que produziu o
 * frete que está sendo cobrado.
 */
export const enderecoParaOPedido = ({ selectedAddress, freeAddressText, routeCoords }: EntradaDoEndereco) => {
  const texto = (freeAddressText || '').trim();

  if (selectedAddress) {
    const lat = routeCoords?.lat ?? selectedAddress.lat;
    const lng = routeCoords?.lng ?? selectedAddress.lng;
    return {
      street: (selectedAddress.street || '').trim(),
      number: (selectedAddress.number || '').trim(),
      neighborhood: (selectedAddress.neighborhood || '').trim(),
      city: (selectedAddress.city || '').trim(),
      state: (selectedAddress.state || '').trim(),
      zip_code: (selectedAddress.zip_code || '').trim(),
      ...(lat != null && lng != null ? { lat, lng } : {}),
      raw_address: texto,
    };
  }

  if (routeCoords) {
    return { lat: routeCoords.lat, lng: routeCoords.lng, raw_address: texto };
  }

  return texto;
};
