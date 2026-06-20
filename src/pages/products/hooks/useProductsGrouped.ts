import type { Product } from '../../../services/products';
import type { StoreCategory } from '../../../services/storesApi';

export interface CategoryGroup {
  id: string | null;
  name: string;
  is_active: boolean;
  sort_order: number;
  products: Product[];
}

const bySortOrder = <T extends { sort_order?: number }>(a: T, b: T) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0);

export function groupProducts(products: Product[], categories: StoreCategory[]): CategoryGroup[] {
  const cats = [...categories].sort(bySortOrder);
  const groups: CategoryGroup[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    is_active: c.is_active,
    sort_order: c.sort_order,
    products: products
      .filter((p) => p.category === c.id)
      .sort(bySortOrder),
  }));

  const uncategorized = products.filter((p) => !p.category).sort(bySortOrder);
  if (uncategorized.length) {
    groups.push({ id: null, name: 'Sem categoria', is_active: true, sort_order: Infinity, products: uncategorized });
  }
  return groups;
}
