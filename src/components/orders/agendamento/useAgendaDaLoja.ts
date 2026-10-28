import { useEffect, useState } from 'react';
import { ordersService } from '../../../services/orders';
import type { DiaDaAgenda } from './faixasDaData';

/** A agenda que o cardápio oferece: faixas reais da loja (turnos, pausa, intervalo). */
export function useAgendaDaLoja(storeSlug: string | null | undefined) {
  const [agenda, setAgenda] = useState<DiaDaAgenda[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!storeSlug) return;
    let vivo = true;
    setCarregando(true);
    Promise.resolve()
      .then(() => ordersService.agendaDaLoja(storeSlug))
      .then((dias) => { if (vivo) setAgenda(dias ?? []); })
      .catch(() => { if (vivo) setAgenda([]); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [storeSlug]);

  return { agenda, carregando };
}
