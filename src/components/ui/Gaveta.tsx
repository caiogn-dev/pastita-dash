import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface GavetaProps {
  /** Nome acessível do diálogo ("Editar cliente"). */
  rotulo: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Classe de largura máxima do painel. */
  larguraMax?: string;
  className?: string;
}

/**
 * Gaveta lateral do kit. Existe porque cada tela montava a sua com dois `div`
 * `fixed`: sem `role="dialog"`, sem Esc, sem trava de foco — o Tab saía para a
 * página de trás e o leitor de tela não sabia que havia um formulário aberto.
 * Monte-a condicionalmente (como as gavetas antigas): montou, está aberta.
 */
export const Gaveta: React.FC<GavetaProps> = ({ rotulo, onClose, children, larguraMax = 'max-w-lg', className }) => {
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef(onClose);
  fechar.current = onClose;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const p = painel.current;
    if (p) ((p.querySelector<HTMLElement>(FOCAVEIS)) ?? p).focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fechar.current();
        return;
      }
      if (e.key !== 'Tab' || !painel.current) return;
      const itens = Array.from(painel.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (itens.length === 0) {
        e.preventDefault();
        painel.current.focus();
        return;
      }
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      const ativo = document.activeElement;
      const fora = !painel.current.contains(ativo);
      if (e.shiftKey && (ativo === primeiro || fora)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (ativo === ultimo || fora)) {
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
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 right-0 z-[60] w-full bg-surface border-l border-border-token shadow-2xl flex flex-col animate-slide-in-right focus:outline-none',
          larguraMax,
          className,
        )}
      >
        {children}
      </div>
    </>
  );
};
