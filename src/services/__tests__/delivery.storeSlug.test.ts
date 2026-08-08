/**
 * O serviço de entrega resolvia a loja por uma função MORTA.
 *
 * `getStoreSlug()` em `hooks/useStore` é um stub que só emite um warn e
 * devolve `null` — existe para empurrar quem chama para o hook. O
 * `delivery.ts` chamava justamente ele:
 *
 *     requireStoreSlug(getStoreSlug())   // sempre null
 *
 * Com `null`, `requireStoreSlug` cai em `VITE_STORE_SLUG`, que em produção
 * multi-tenant é VAZIO, e então LANÇA. O `getStoreLocation` engolia a exceção
 * num `catch` e devolvia `null`, e a página de Zonas de Entrega concluía que a
 * loja não tinha endereço — mostrando "Configurar Localização" para lojas com
 * endereço, CEP, latitude e longitude preenchidos no banco.
 *
 * Dois erros que se escondem: função morta que devolve valor plausível, e
 * `catch` que transforma falha de configuração em "não há dados".
 *
 * `getStoreSlugWithFallback()` é a função certa — sua própria documentação diz
 * que nasceu para corrigir esta mesma classe de bug em relatórios e exports.
 */
import { deliveryService } from '../delivery';
import api from '../api';
import { useRootStore } from '../../stores/rootStore';

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() },
}));

const apiMock = api as unknown as { get: jest.Mock; patch: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  useRootStore.setState({
    stores: [
      { id: 'uuid-ce', slug: 'ce-saladas', name: 'Cê Saladas' },
      { id: 'uuid-pa', slug: 'pastita', name: 'Pastita' },
    ],
    selectedStoreId: 'uuid-ce',
  } as never);
});

describe('deliveryService — resolução da loja', () => {
  it('busca a localização da loja SELECIONADA', async () => {
    apiMock.get.mockResolvedValue({ data: { id: 'uuid-ce', latitude: -10.18, longitude: -48.3 } });

    const loc = await deliveryService.getStoreLocation();

    expect(apiMock.get).toHaveBeenCalledWith('/stores/ce-saladas/');
    expect(loc).toMatchObject({ latitude: -10.18 });
  });

  it('trocar de loja troca o endereço consultado', async () => {
    apiMock.get.mockResolvedValue({ data: { id: 'uuid-pa' } });
    useRootStore.setState({ selectedStoreId: 'uuid-pa' } as never);

    await deliveryService.getStoreLocation();

    expect(apiMock.get).toHaveBeenCalledWith('/stores/pastita/');
  });

  it('salvar localização vai para a loja selecionada, não para uma default', async () => {
    // Escrever na loja errada é pior que não escrever: você "corrige" o
    // endereço de uma loja e quem muda é outra.
    apiMock.patch.mockResolvedValue({ data: {} });

    await deliveryService.updateStoreLocation({ zip_code: '77020170' });

    expect(apiMock.patch).toHaveBeenCalledWith('/stores/ce-saladas/', { zip_code: '77020170' });
  });

  it('resposta vazia continua virando null', async () => {
    // Comportamento existente que não pode regredir: `{}` não é localização.
    apiMock.get.mockResolvedValue({ data: {} });
    expect(await deliveryService.getStoreLocation()).toBeNull();
  });
});

describe('getStoreLocation — falha não vira "sem endereço"', () => {
  it('erro de rede propaga em vez de virar null', async () => {
    // `null` significa "esta loja não tem localização cadastrada", e a tela age
    // nisso oferecendo "Configurar Localização". Falha de rede ou de config não
    // é isso — devolver null manda o dono consertar o que não está quebrado.
    apiMock.get.mockRejectedValue(new Error('Network Error'));
    await expect(deliveryService.getStoreLocation()).rejects.toThrow('Network Error');
  });

  it('sem loja selecionada e sem default, o erro aparece', async () => {
    useRootStore.setState({ stores: [], selectedStoreId: null } as never);
    await expect(deliveryService.getStoreLocation()).rejects.toThrow(/loja/i);
  });
});
