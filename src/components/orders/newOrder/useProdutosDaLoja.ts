import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { productsService } from '../../../services/products';
import type { Product } from '../../../services/products';

/**
 * Todos os produtos ativos da loja, todas as páginas. Com uma página só de 40,
 * a Ivoneth (58 ativos) tinha 18 produtos que nunca apareciam no pedido.
 */
export function useProdutosDaLoja(storeId: string) {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setCarregando(false);
      return;
    }
    let vivo = true;
    setCarregando(true);
    (async () => {
      const todos: Product[] = [];
      for (let page = 1; page <= 20; page++) {
        const data = await productsService.getProducts({ store: storeId, is_active: true, page, page_size: 200, ordering: 'name' });
        todos.push(...(data.results || []));
        if (!data.next) break;
      }
      return todos;
    })()
      .then((todos) => { if (vivo) setProdutos(todos); })
      .catch(() => { if (vivo) { setProdutos([]); toast.error('Erro ao carregar produtos'); } })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [storeId]);

  return { produtos, carregando };
}
