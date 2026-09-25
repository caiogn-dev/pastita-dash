/**
 * Uma seção do formulário de programa de fidelidade, com título em frase.
 *
 * O formulário antigo era uma pilha de campos sem fio condutor. As seções
 * seguem a pergunta que o dono faz ao montar um programa — "como o cliente
 * ganha", "o que ele recebe", "onde vale" — e servem igual ao cartão de
 * carimbo e ao cashback, para os dois formulários lerem do mesmo jeito.
 *
 * Título em frase, não rótulo em caixa alta: a tela conversa com o dono.
 */
import React, { useId } from 'react';

import { cn } from '../../utils/cn';

export interface SecaoDoProgramaProps {
  titulo: string;
  /** Uma frase curta sob o título, quando o título sozinho não basta. */
  descricao?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const SecaoDoPrograma: React.FC<SecaoDoProgramaProps> = ({
  titulo,
  descricao,
  children,
  className,
}) => {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn('space-y-3 border-t border-border-token pt-5', className)}
    >
      <div>
        <h3 id={id} className="text-body font-semibold text-fg-token">
          {titulo}
        </h3>
        {descricao && (
          <p className="mt-0.5 text-caption text-fg-muted-token">{descricao}</p>
        )}
      </div>
      {children}
    </section>
  );
};

SecaoDoPrograma.displayName = 'SecaoDoPrograma';

export default SecaoDoPrograma;
