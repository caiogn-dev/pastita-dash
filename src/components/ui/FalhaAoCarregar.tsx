import React from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface FalhaAoCarregarProps {
  /** O que não veio, em frase: "Não foi possível carregar as avaliações". */
  titulo: string;
  descricao?: string;
  /** Presente = botão "Tentar novamente". */
  onTentarDeNovo?: () => void;
  className?: string;
}

/**
 * A consulta caiu — dito com todas as letras, com o botão de tentar de novo.
 *
 * Existe para impedir o "vazio enganoso": sem ela a tela mostra zeros ou
 * "nenhum pedido", afirmando que a loja não tem o dado quando foi a conexão
 * que falhou. Era escrita à mão em cada tela, em vermelho cru do Tailwind.
 */
export const FalhaAoCarregar: React.FC<FalhaAoCarregarProps> = ({
  titulo,
  descricao = 'Verifique sua conexão e tente novamente.',
  onTentarDeNovo,
  className,
}) => (
  <div
    role="alert"
    className={cn(
      'flex flex-wrap items-center gap-3 rounded-xl border border-danger-token bg-danger-soft px-4 py-3.5',
      className,
    )}
  >
    <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-danger-token" aria-hidden />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-fg-token">{titulo}</p>
      {descricao && <p className="mt-0.5 text-caption text-fg-muted-token">{descricao}</p>}
    </div>
    {onTentarDeNovo && (
      <Button
        size="sm"
        variant="danger"
        leftIcon={<ArrowPathIcon className="h-4 w-4" />}
        onClick={onTentarDeNovo}
      >
        Tentar novamente
      </Button>
    )}
  </div>
);

FalhaAoCarregar.displayName = 'FalhaAoCarregar';
