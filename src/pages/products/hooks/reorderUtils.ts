export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export function reindex<T extends { id: string }>(items: T[]) {
  return items.map((it, i) => ({ id: it.id, sort_order: i }));
}

export function diffSortOrders(
  before: Array<{ id: string; sort_order: number }>,
  after: Array<{ id: string; sort_order: number }>,
) {
  const prev = new Map(before.map((b) => [b.id, b.sort_order]));
  return after.filter((a) => prev.get(a.id) !== a.sort_order);
}
