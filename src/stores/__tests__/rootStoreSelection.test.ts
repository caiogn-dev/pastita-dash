import { useRootStore } from '../rootStore';

const STORES = [
  { id: 'id-1', slug: 'loja-a', name: 'Loja A' },
  { id: 'id-2', slug: 'loja-b', name: 'Loja B' },
];

describe('rootStore — seleção de loja', () => {
  beforeEach(() => {
    localStorage.clear();
    useRootStore.setState({ stores: [], selectedStoreId: null });
  });

  it('auto-seleciona a primeira loja quando nada está selecionado', () => {
    useRootStore.getState().setStores(STORES);
    expect(useRootStore.getState().selectedStoreId).toBe('id-1');
  });

  it('mantém a seleção atual se ainda for válida', () => {
    useRootStore.setState({ selectedStoreId: 'id-2' });
    useRootStore.getState().setStores(STORES);
    expect(useRootStore.getState().selectedStoreId).toBe('id-2');
  });

  it('restaura a loja persistida no localStorage', () => {
    localStorage.setItem('cardapidex_selected_store', 'id-2');
    useRootStore.getState().setStores(STORES);
    expect(useRootStore.getState().selectedStoreId).toBe('id-2');
  });

  it('setSelectedStore persiste no localStorage', () => {
    useRootStore.getState().setSelectedStore('id-1');
    expect(localStorage.getItem('cardapidex_selected_store')).toBe('id-1');
  });

  it('seleção inválida (loja removida) cai para a primeira', () => {
    useRootStore.setState({ selectedStoreId: 'id-morto' });
    useRootStore.getState().setStores(STORES);
    expect(useRootStore.getState().selectedStoreId).toBe('id-1');
  });
});

/**
 * Regressão de 01/set: o painel mostrava a loja ERRADA no cabeçalho.
 *
 * StoreDetailPage chama setSelectedStore(storeId) com o que veio de
 * useParams() — e a rota é /stores/:storeId onde :storeId é o SLUG.
 * O slug ia inteiro para selectedStoreId e para o localStorage, mas
 * useStore() e o StoreSelector resolvem a loja com `find(s => s.id === ...)`,
 * só por UUID. Não achavam nada, e o StoreSelector caía no `?? stores[0]`:
 * a URL dizia ce-saladas e o cabeçalho dizia "WebSocket Test Store".
 *
 * selectedStoreId é, por contrato, SEMPRE o UUID. Quem escreve normaliza.
 */
describe('rootStore — slug nunca vira selectedStoreId', () => {
  beforeEach(() => {
    localStorage.clear();
    useRootStore.setState({ stores: [], selectedStoreId: null });
  });

  it('setSelectedStore com slug guarda o UUID da loja', () => {
    useRootStore.getState().setStores(STORES);
    useRootStore.getState().setSelectedStore('loja-b');
    expect(useRootStore.getState().selectedStoreId).toBe('id-2');
  });

  it('setSelectedStore com slug persiste o UUID, não o slug', () => {
    useRootStore.getState().setStores(STORES);
    useRootStore.getState().setSelectedStore('loja-b');
    expect(localStorage.getItem('cardapidex_selected_store')).toBe('id-2');
  });

  it('setStores normaliza uma seleção que já estava em slug', () => {
    useRootStore.setState({ selectedStoreId: 'loja-b' });
    useRootStore.getState().setStores(STORES);
    expect(useRootStore.getState().selectedStoreId).toBe('id-2');
  });

  it('setStores normaliza o slug que ficou salvo no localStorage', () => {
    localStorage.setItem('cardapidex_selected_store', 'loja-b');
    useRootStore.getState().setStores(STORES);
    expect(useRootStore.getState().selectedStoreId).toBe('id-2');
    expect(localStorage.getItem('cardapidex_selected_store')).toBe('id-2');
  });

  it('setSelectedStore antes da lista chegar não perde a escolha', () => {
    useRootStore.getState().setSelectedStore('loja-b');
    useRootStore.getState().setStores(STORES);
    expect(useRootStore.getState().selectedStoreId).toBe('id-2');
  });
});
