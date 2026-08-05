/**
 * O cache de pedidos precisa ter UMA chave só.
 *
 * Regressão: o board (OrdersPage) e o KDS gravavam/liam por SLUG — que vem do
 * parâmetro da rota — enquanto o useRealTimeOrders gravava por UUID
 * (selectedStoreId). O WebSocket escrevia num bucket que o board nunca lia, e o
 * pedido novo só aparecia com refresh manual. O caminho mobile parecia funcionar
 * porque useStoreOrdersFeed já usava UUID.
 */
import { useRootStore, resolveStoreKey } from '../rootStore';
import type { Store, StoreOrder } from '../../services/storesApi';

const loja = { id: 'uuid-loja-1', slug: 'ce-saladas', name: 'Cê Saladas' } as unknown as Store;
const pedido = (id: string) => ({ id, status: 'pending' } as unknown as StoreOrder);

const estadoInicial = useRootStore.getState();

beforeEach(() => {
  useRootStore.setState({ ...estadoInicial, stores: [loja], orders: {}, selectedStoreId: loja.id });
});

describe('resolveStoreKey', () => {
  it('converte slug em uuid', () => {
    expect(resolveStoreKey([loja], 'ce-saladas')).toBe('uuid-loja-1');
  });

  it('mantém uuid como uuid', () => {
    expect(resolveStoreKey([loja], 'uuid-loja-1')).toBe('uuid-loja-1');
  });

  it('devolve o valor recebido quando as lojas ainda não carregaram', () => {
    expect(resolveStoreKey([], 'ce-saladas')).toBe('ce-saladas');
  });

  it('não quebra com valor vazio', () => {
    expect(resolveStoreKey([loja], null)).toBe('');
    expect(resolveStoreKey([loja], undefined)).toBe('');
  });
});

describe('cache de pedidos com chave única', () => {
  it('grava por slug e lê por uuid (o caso que quebrava o board)', () => {
    useRootStore.getState().setOrders('ce-saladas', [pedido('p1')]);
    expect(useRootStore.getState().orders['uuid-loja-1']).toHaveLength(1);
    expect(useRootStore.getState().orders['ce-saladas']).toBeUndefined();
  });

  it('grava por uuid (WebSocket) e o board que pediu por slug enxerga', () => {
    useRootStore.getState().setOrders('uuid-loja-1', [pedido('p1'), pedido('p2')]);
    const key = resolveStoreKey(useRootStore.getState().stores, 'ce-saladas');
    expect(useRootStore.getState().orders[key]).toHaveLength(2);
  });

  it('escrita por slug e depois por uuid usa o MESMO bucket, sem duplicar', () => {
    useRootStore.getState().setOrders('ce-saladas', [pedido('p1')]);
    useRootStore.getState().setOrders('uuid-loja-1', [pedido('p1'), pedido('p2')]);
    expect(Object.keys(useRootStore.getState().orders)).toEqual(['uuid-loja-1']);
    expect(useRootStore.getState().orders['uuid-loja-1']).toHaveLength(2);
  });

  it('clearOrders limpa o bucket mesmo recebendo o slug', () => {
    useRootStore.getState().setOrders('uuid-loja-1', [pedido('p1')]);
    useRootStore.getState().clearOrders('ce-saladas');
    expect(useRootStore.getState().orders['uuid-loja-1']).toBeUndefined();
  });

  it('lojas diferentes continuam em buckets separados', () => {
    const outra = { id: 'uuid-loja-2', slug: 'kero-kero', name: 'Kero Kero' } as unknown as Store;
    useRootStore.setState({ stores: [loja, outra] });
    useRootStore.getState().setOrders('ce-saladas', [pedido('p1')]);
    useRootStore.getState().setOrders('kero-kero', [pedido('p2'), pedido('p3')]);
    expect(useRootStore.getState().orders['uuid-loja-1']).toHaveLength(1);
    expect(useRootStore.getState().orders['uuid-loja-2']).toHaveLength(2);
  });
});
