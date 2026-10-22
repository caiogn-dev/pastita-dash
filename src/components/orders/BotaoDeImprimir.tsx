/**
 * Um botão de impressão no lugar de quatro (22/10).
 *
 * A barra do pedido tinha "Imprimir rápido" + Pedido | Cozinha | Preparo: quatro
 * alvos para uma decisão só, e o dono não sabia qual apertar. O clique
 * principal faz o caso de todo dia — a comanda inteira na impressora da loja.
 * A seta guarda as vias de exceção, e o navegador fica por último: é o plano B
 * de quando o agente não está ligado.
 *
 * O menu abre para CIMA: o botão mora na barra fixa do rodapé do modal.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronUpIcon, PrinterIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';

export type ViaDeImpressao = 'pedido' | 'cozinha' | 'preparo';
export type DestinoDeImpressao = 'impressora' | 'navegador';

const VIAS: { via: ViaDeImpressao; rotulo: string }[] = [
  { via: 'pedido', rotulo: 'Pedido completo' },
  { via: 'cozinha', rotulo: 'Cozinha (sem preços)' },
  { via: 'preparo', rotulo: 'Preparo (montagem)' },
];

export interface BotaoDeImprimirProps {
  onImprimir: (via: ViaDeImpressao, destino: DestinoDeImpressao) => void;
  ocupado?: boolean;
}

export const BotaoDeImprimir: React.FC<BotaoDeImprimirProps> = ({ onImprimir, ocupado }) => {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // O modal do pedido também fecha no Escape: o menu fecha sozinho.
        e.stopPropagation();
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc, true);
    };
  }, [aberto]);

  const escolher = (via: ViaDeImpressao, destino: DestinoDeImpressao) => {
    setAberto(false);
    onImprimir(via, destino);
  };

  const item = 'block w-full px-3 py-2 text-left text-sm text-fg-token hover:bg-surface-2 focus:bg-surface-2 focus:outline-none';

  return (
    <div ref={raiz} className="relative inline-flex">
      <button
        type="button"
        onClick={() => onImprimir('pedido', 'impressora')}
        disabled={ocupado}
        className="inline-flex items-center gap-1.5 rounded-l-lg border border-border-token px-3 py-2 text-xs font-medium text-fg-token transition hover:bg-surface-2 disabled:opacity-60"
      >
        <PrinterIcon className={cn('h-4 w-4', ocupado && 'animate-pulse')} />
        Imprimir
      </button>
      <button
        type="button"
        aria-label="Outras vias de impressão"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="-ml-px inline-flex items-center rounded-r-lg border border-border-token px-2 py-2 text-fg-token transition hover:bg-surface-2"
      >
        <ChevronUpIcon className={cn('h-4 w-4 transition-transform', !aberto && 'rotate-180')} />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 superficie w-60 overflow-hidden py-1 shadow-lg"
        >
          <p className="px-3 pb-1 pt-2 text-xs font-medium text-fg-muted-token">Na impressora da loja</p>
          {VIAS.map(({ via, rotulo }) => (
            <button key={via} type="button" role="menuitem" className={item} onClick={() => escolher(via, 'impressora')}>
              {rotulo}
            </button>
          ))}
          <div className="my-1 border-t border-border-token" />
          <p className="px-3 pb-1 pt-1 text-xs font-medium text-fg-muted-token">Pelo navegador</p>
          {VIAS.map(({ via, rotulo }) => (
            <button key={via} type="button" role="menuitem" className={item} onClick={() => escolher(via, 'navegador')}>
              {rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BotaoDeImprimir;
