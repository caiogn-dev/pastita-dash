import React from 'react';

/**
 * Toggle acessível (switch) usado na lista de conexões.
 *
 * É um controle sem texto visível — apenas o "pino" visual. Por isso exige um
 * `label` para dar nome acessível ao leitor de tela, e expõe `role="switch"` +
 * `aria-checked` para anunciar o estado ligado/desligado.
 */
export const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-surface shadow transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
    />
  </button>
);

export default Toggle;
