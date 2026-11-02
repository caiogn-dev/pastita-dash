import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Som de pedido novo, por aparelho: o computador do balcão quer alto, o
 * notebook do dono em casa talvez mudo. Fica no navegador, não na loja.
 */
export type VolumeDoSom = 'baixo' | 'medio' | 'alto';

export const GANHO_DO_VOLUME: Record<VolumeDoSom, number> = { baixo: 0.35, medio: 0.65, alto: 1 };

interface SomDosPedidos {
  ligado: boolean;
  volume: VolumeDoSom;
  setLigado: (ligado: boolean) => void;
  setVolume: (volume: VolumeDoSom) => void;
}

export const useSomDosPedidos = create<SomDosPedidos>()(
  persist(
    (set) => ({
      ligado: true,
      volume: 'alto',
      setLigado: (ligado) => set({ ligado }),
      setVolume: (volume) => set({ volume }),
    }),
    { name: 'som-dos-pedidos' },
  ),
);
