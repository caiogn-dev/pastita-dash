import { reindex, moveItem, diffSortOrders } from '../reorderUtils';

describe('reorderUtils', () => {
  it('moveItem reordena', () => {
    expect(moveItem(['a','b','c'], 0, 2)).toEqual(['b','c','a']);
  });
  it('reindex numera 0..n', () => {
    expect(reindex([{id:'a'},{id:'b'}])).toEqual([{id:'a',sort_order:0},{id:'b',sort_order:1}]);
  });
  it('diffSortOrders retorna só os alterados', () => {
    const before = [{id:'a',sort_order:0},{id:'b',sort_order:1}];
    const after = [{id:'b',sort_order:0},{id:'a',sort_order:1}];
    expect(diffSortOrders(before, after).sort((x,y)=>x.id<y.id?-1:1))
      .toEqual([{id:'a',sort_order:1},{id:'b',sort_order:0}]);
  });
});
