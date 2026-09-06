import React, { useId } from 'react';

import { cn } from '../../utils/cn';

export interface OpcaoDeSelect {
  valor: string;
  rotulo: string;
  desabilitada?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'children'> {
  opcoes: OpcaoDeSelect[];
  valor: string;
  /** Recebe o VALOR — não o evento. `e.target.value` em cada chamador é ruído. */
  onMudar: (valor: string) => void;
  /** Rótulo visível, ligado ao campo por `htmlFor`. */
  rotulo?: string;
  /** Nome acessível quando o rótulo visível seria redundante (barra de filtros). */
  rotuloOculto?: string;
  /** Primeira opção, de valor vazio: "Todos os status", "Qualquer categoria". */
  vazio?: string;
  /** Mensagem de erro sob o campo; também marca `aria-invalid`. */
  erro?: string;
  className?: string;
}

/**
 * O campo de escolha do painel. ESPECIFICAÇÃO em `__tests__/Select.spec.tsx`.
 *
 * Por dentro é o `<select>` nativo: teclado, busca por digitação e o seletor de
 * roda do celular são melhores que qualquer reimplementação. O que este
 * componente resolve é o que estava divergindo — anel de foco na cor da marca,
 * fundo próprio, rotulagem obrigatória e a opção "todos" com um nome só.
 */
export const Select: React.FC<SelectProps> = ({
  opcoes,
  valor,
  onMudar,
  rotulo,
  rotuloOculto,
  vazio,
  erro,
  className,
  id,
  ...resto
}) => {
  const gerado = useId();
  const idDoCampo = id ?? `sel-${gerado}`;
  const idDoErro = `${idDoCampo}-erro`;

  if (process.env.NODE_ENV !== 'production' && !rotulo && !rotuloOculto && !resto['aria-label']) {
    // Alto e cedo: foi deixando passar que o painel juntou dezenas de combos
    // que o leitor de tela anuncia só como "combo box".
    console.error('Select sem nome acessível: informe `rotulo` ou `rotuloOculto`.');
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {rotulo && (
        <label htmlFor={idDoCampo} className="text-sm font-medium text-fg-token">
          {rotulo}
        </label>
      )}

      <select
        {...resto}
        id={idDoCampo}
        aria-label={rotuloOculto ?? resto['aria-label']}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idDoErro : undefined}
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm text-fg-token transition-colors',
          // `bg-surface` e não `bg-transparent`: transparente herda o fundo de
          // onde estiver, e a lista nativa fica sem contraste garantido.
          'bg-surface',
          // O anel é o da MARCA. Havia `focus:ring-indigo-500` e
          // `focus:ring-primary-500` na mesma tela que o resto usava brand:
          // quem navega por teclado via a cor do foco mudar entre campos.
          'focus:outline-none focus:ring-2 focus:ring-brand',
          erro ? 'border-[var(--danger)]' : 'border-border-token',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} disabled={o.desabilitada}>
            {o.rotulo}
          </option>
        ))}
      </select>

      {erro && (
        <p id={idDoErro} className="text-xs text-danger-token">
          {erro}
        </p>
      )}
    </div>
  );
};

Select.displayName = 'Select';
