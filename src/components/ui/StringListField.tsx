import React, { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface StringListFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helperText?: string;
  addLabel?: string;
}

/**
 * Lista de textos curtos editável — cada item é uma linha com botão de remover.
 *
 * Nasceu para `attributes.inclui` do produto e `metadata.inclui` do combo: o
 * lojista declara o que acompanha um prato composto e o atendente de WhatsApp
 * lê esse dado em vez de adivinhar. Serve também para `tags`, que existe no
 * tipo do produto e nunca teve UI.
 */
export const StringListField: React.FC<StringListFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  addLabel = 'Adicionar item',
}) => {
  const [rascunho, setRascunho] = useState('');

  const adicionar = () => {
    const texto = rascunho.trim();
    if (!texto) return;
    onChange([...value, texto]);
    setRascunho('');
  };

  const remover = (indice: number) => {
    onChange(value.filter((_, i) => i !== indice));
  };

  const editar = (indice: number, texto: string) => {
    onChange(value.map((item, i) => (i === indice ? texto : item)));
  };

  const campo =
    'w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand';

  return (
    <div>
      <label className="block text-sm font-medium text-fg-token mb-1">{label}</label>

      {value.length > 0 && (
        <ul className="space-y-2 mb-2">
          {value.map((item, indice) => (
            <li key={indice} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => editar(indice, e.target.value)}
                className={campo}
              />
              <button
                type="button"
                onClick={() => remover(indice)}
                aria-label={`Remover ${item || 'item'}`}
                className="shrink-0 p-2 rounded text-fg-muted-token hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          // Enter aqui não pode submeter o formulário inteiro — o campo vive
          // dentro de forms grandes (produto, combo) e o reflexo do usuário
          // depois de digitar um item é apertar Enter.
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder={placeholder}
          className={campo}
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={!rascunho.trim()}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded border border-border-token text-sm text-fg-token hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          {addLabel}
        </button>
      </div>

      {helperText && <p className="mt-1 text-xs text-fg-muted-token">{helperText}</p>}
    </div>
  );
};

export default StringListField;
