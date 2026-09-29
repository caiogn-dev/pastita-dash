import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

export type TomDoAviso = 'sucesso' | 'info' | 'atencao' | 'erro';

export interface AvisoProps {
  tom: TomDoAviso;
  titulo: string;
  /** Uma frase curta. Aviso não é manual. */
  children?: React.ReactNode;
  /** Botão ou link que resolve o que o aviso diz. */
  acao?: React.ReactNode;
  onFechar?: () => void;
  className?: string;
}

const ESTILO: Record<TomDoAviso, { caixa: string; texto: string; Icone: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  sucesso: { caixa: 'bg-success-soft', texto: 'text-success-token', Icone: CheckCircleIcon },
  info: { caixa: 'bg-info-soft', texto: 'text-info-token', Icone: InformationCircleIcon },
  atencao: { caixa: 'bg-warning-soft', texto: 'text-warning-token', Icone: ExclamationTriangleIcon },
  erro: { caixa: 'bg-danger-soft', texto: 'text-danger-token', Icone: XCircleIcon },
};

/**
 * Faixa de estado dentro de uma seção: "Conta própria configurada",
 * "Sem conta própria", "Estoque OK". Substitui o bloco verde/azul/âmbar/
 * vermelho que cada tela montava com cor crua do Tailwind.
 */
export const Aviso: React.FC<AvisoProps> = ({ tom, titulo, children, acao, onFechar, className }) => {
  const { caixa, texto, Icone } = ESTILO[tom];
  return (
    <div role={tom === 'erro' ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 rounded-lg p-3 text-sm', caixa, className)} data-tom={tom}>
      <Icone className={cn('mt-0.5 h-5 w-5 shrink-0', texto)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', texto)}>{titulo}</p>
        {children && <div className="mt-0.5 text-fg-token">{children}</div>}
        {acao && <div className="mt-2">{acao}</div>}
      </div>
      {onFechar && (
        <button type="button" onClick={onFechar} aria-label="Fechar aviso" className="shrink-0 rounded p-0.5 text-fg-muted-token hover:text-fg-token">
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default Aviso;
