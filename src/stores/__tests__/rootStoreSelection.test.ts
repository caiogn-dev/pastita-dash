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
