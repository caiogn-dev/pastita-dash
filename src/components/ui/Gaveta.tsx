/**
 * Gaveta — painel lateral modal (ficha do cliente, edição de pedido).
 *
 * Diálogo de verdade: role="dialog" + aria-modal, nome acessível, Esc fecha,
 * Tab fica preso, foco volta a quem abriu.
 *
 * Empilhamento: quando um Modal abre POR CIMA (ex.: confirmar exclusão), a
 * gaveta de baixo se cala — Esc fecha só o modal e o Tab não disputa o foco.
 * "Por cima" = outro `[aria-modal="true"]` que vem depois no documento.
 */
import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

export interface GavetaProps {
  onClose: () => void;
  /** Nome acessível do diálogo. */
  ariaLabel: string;
  /** Largura/ajustes do painel (ex.: `max-w-lg`). */
  className?: string;
  children: React.ReactNode;
}

const FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function haModalPorCima(painel: HTMLElement): boolean {
  const modais = document.querySelectorAll<HTMLElement>('[aria-modal="true"]');
  return Array.from(modais).some(
    (m) =>
      m !== painel &&
      !painel.contains(m) &&
      !!(painel.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING),
  );
}

export const Gaveta: React.FC<GavetaProps> = ({ onClose, ariaLabel, className, children }) => {
  const painelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const painel = painelRef.current;
    if (painel) {
      const focaveis = Array.from(painel.querySelectorAll<HTMLElement>(FOCAVEIS));
      (focaveis[0] ?? painel).focus();
    }

    const aoTeclar = (e: KeyboardEvent) => {
      const p = painelRef.current;
      if (!p || haModalPorCima(p)) return;
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focaveis = Array.from(p.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (focaveis.length === 0) {
        e.preventDefault();
        p.focus();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;
      if (e.shiftKey) {
        if (ativo === primeiro || !p.contains(ativo)) {
          e.preventDefault();
          ultimo.focus();
        }
      } else if (ativo === ultimo || !p.contains(ativo)) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      anterior?.focus?.();
    };
  }, []);

  return (
    <>
      <div
        data-testid="gaveta-fundo"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 right-0 z-[60] w-full bg-surface border-l border-border-token shadow-2xl flex flex-col animate-slide-in-right focus:outline-none',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
};
