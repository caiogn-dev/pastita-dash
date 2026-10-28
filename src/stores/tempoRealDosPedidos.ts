import { create } from 'zustand';

/**
 * Estado da conexão de pedidos ao vivo. Quem conecta é o `PedidosAoVivo`, no
 * layout; as telas só leem (selo "Ao vivo"/"Offline" do quadro).
 */
interface TempoRealDosPedidos {
  conectado: boolean;
  falhou: boolean;
  definir: (estado: { conectado: boolean; falhou: boolean }) => void;
}

export const useTempoRealDosPedidos = create<TempoRealDosPedidos>((set) => ({
  conectado: false,
  falhou: false,
  definir: (estado) => set(estado),
}));
