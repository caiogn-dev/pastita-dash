import React, { useId, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

export interface RecolhivelProps {
  /** O que abre: "Chaves do Pagar.me". É o nome acessível do botão. */
  titulo: string;
  /** Estado ao lado do título, visível fechado: um `SeloDeEstado`. */
  selo?: React.ReactNode;
  /** Controlado: a seção abre sozinha quando precisa mostrar um erro. */
  aberto?: boolean;
  onAbertoMudar?: (aberto: boolean) => void;
  /** Não controlado: começa aberto? */
  abertoInicial?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Configuração técnica atrás de um clique (26/11). Credencial, token e chave
 * não ficam na tela o tempo todo: o painel é produto do lojista, não
 * depurador. Fechado, o conteúdo NÃO é montado — nada de campo escondido que o
 * leitor de tela ainda lê.
 */
export const Recolhivel: React.FC<RecolhivelProps> = ({
  titulo, selo, aberto, onAbertoMudar, abertoInicial = false, children, className,
}) => {
  const [interno, setInterno] = useState(abertoInicial);
  const estaAberto = aberto ?? interno;
  const id = useId();

  const alternar = () => {
    const proximo = !estaAberto;
    if (aberto === undefined) setInterno(proximo);
    onAbertoMudar?.(proximo);
  };

  return (
    <div className={cn('rounded-lg border border-border-token', className)}>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={estaAberto}
        aria-controls={id}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-fg-token hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ChevronDownIcon
          aria-hidden
          className={cn('h-4 w-4 shrink-0 text-fg-muted-token transition-transform', !estaAberto && '-rotate-90')}
        />
        <span className="flex-1">{titulo}</span>
        {selo}
      </button>
      {estaAberto && (
        <div id={id} className="space-y-4 border-t border-border-token px-3 py-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default Recolhivel;
