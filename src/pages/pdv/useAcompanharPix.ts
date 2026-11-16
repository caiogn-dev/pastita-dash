/**
 * Acompanha as cobranças PIX do balcão até todas pagarem. Antes era um
 * `setInterval` solto na página que seguia batendo a cada 4s com a aba
 * escondida; agora usa o `usePolling` (pausa escondida e atualiza na hora ao
 * voltar — que é quando o operador quer saber se o cliente pagou).
 */
import type { Dispatch, SetStateAction } from 'react';
import { ordersService } from '../../services/orders';
import { usePolling } from '../../hooks/usePolling';

export interface CobrancaPix {
  order: { id: string | number };
  storeSlug: string;
  paid: boolean;
}

export const INTERVALO_PIX_MS = 4000;

export const useAcompanharPix = <T extends CobrancaPix>(
  cobrancas: T[] | null,
  setCobrancas: Dispatch<SetStateAction<T[] | null>>,
  aoPagarTudo: () => void,
): void => {
  usePolling(async () => {
    if (!cobrancas || cobrancas.every((c) => c.paid)) return;
    const pendentes = cobrancas.filter((c) => !c.paid);
    const resultados = await Promise.all(pendentes.map(async (c) => {
      try {
        const fresca = await ordersService.getOrder(String(c.order.id), c.storeSlug);
        return { id: c.order.id, paid: fresca.payment_status === 'paid' };
      } catch {
        return { id: c.order.id, paid: false };
      }
    }));
    setCobrancas((prev) => {
      if (!prev) return prev;
      const next = prev.map((c) => {
        const r = resultados.find((x) => x.id === c.order.id);
        return r && r.paid ? { ...c, paid: true } : c;
      });
      if (next.every((c) => c.paid) && !prev.every((c) => c.paid)) aoPagarTudo();
      return next;
    });
  }, INTERVALO_PIX_MS);
};
