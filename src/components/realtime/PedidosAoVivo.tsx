/**
 * Dono único do tempo real de pedidos no painel (28/10).
 *
 * Antes cada página (quadro, celular) montava o hook, e o som de pedido novo
 * só tocava com uma delas aberta — no Início ou no inbox o pedido entrava
 * mudo. Montado no layout, vale para todas as telas. A cozinha (/kds) fica
 * fora do layout e monta o seu.
 */
import { useEffect } from 'react';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import { useTempoRealDosPedidos } from '../../stores/tempoRealDosPedidos';

export function PedidosAoVivo(): null {
  const { isConnected, connectionError } = useRealTimeOrders({
    apiUrl: import.meta.env.VITE_API_URL,
    // Base only: o client monta /ws/stores/<slug>/orders/.
    wsUrl: import.meta.env.VITE_WS_URL,
  });
  const definir = useTempoRealDosPedidos((s) => s.definir);
  useEffect(() => {
    definir({ conectado: isConnected, falhou: connectionError });
  }, [isConnected, connectionError, definir]);
  return null;
}
