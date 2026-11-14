import React from 'react';
import { cn } from '../../utils/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Nome acessível do controle. Obrigatório quando não há um rótulo visível associado via ariaLabelledby. */
  ariaLabel?: string;
  /** Id de um elemento visível que rotula o switch (alternativa a ariaLabel). */
  ariaLabelledby?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  ariaLabel,
  ariaLabelledby,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6',
    lg: 'w-14 h-8',
  };

  // Borda nos DOIS estados e folga fixa por dentro: antes a borda só existia
  // desligado, e a bolinha encostava nela de um lado e sobrava do outro (13/11).
  // Conta: trilho − 2×borda − 2×folga − bolinha = quanto a bolinha anda.
  const paddingClasses = {
    sm: 'p-px',     // 32 − 2 − 2 − 12 = 16 → translate-x-4
    md: 'p-[3px]',  // 44 − 2 − 6 − 16 = 20 → translate-x-5
    lg: 'p-[3px]',  // 56 − 2 − 6 − 24 = 24 → translate-x-6
  };

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const thumbCheckedClasses = {
    sm: 'translate-x-4',
    md: 'translate-x-5',
    lg: 'translate-x-6',
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        // shrink-0: numa coluna estreita, ao lado de um rótulo longo, o trilho
        // encolhia e a bolinha saía do lugar.
        'relative inline-flex shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
        // Ligado usa a cor do PAINEL, não a da loja.
        //
        // Era `bg-primary-500`, que é a cor da marca do lojista: na Cê Saladas
        // isso pinta a chave de terracota, e no tema escuro toda opção LIGADA
        // aparece vermelha — a cor que o resto do painel usa para erro e para
        // excluir. Uma tela com quatro chaves ligadas parecia quatro alertas.
        // O ouro é o mesmo do botão primário e do anel de foco.
        checked ? 'bg-brand border-brand' : 'bg-surface-2 border-[var(--border-strong)]',
        paddingClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        sizeClasses[size],
        className
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full transition-transform duration-200 ease-in-out',
          // Desligado precisa PARECER desligado: com o botão branco nos dois
          // estados, no tema escuro o switch apagado virava o ponto mais claro
          // da linha — numa lista, os pausados saltavam mais que os ativos.
          checked ? 'bg-white' : 'bg-fg-muted-token',
          thumbSizeClasses[size],
          checked && thumbCheckedClasses[size]
        )}
      />
    </button>
  );
};
