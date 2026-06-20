import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  saving?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export const AddCategoryModal: React.FC<Props> = ({ isOpen, saving, onClose, onCreate }) => {
  const [name, setName] = useState('');
  if (!isOpen) return null;
  const trimmed = name.trim();
  const submit = () => {
    if (!trimmed || saving) return;
    onCreate(trimmed);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg bg-surface-token p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-primary-token">Nova categoria</h2>
        <input
          autoFocus
          aria-label="nome da categoria"
          className="mb-4 w-full rounded border px-3 py-2"
          placeholder="Ex.: Bebidas"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="flex justify-end gap-2">
          <button className="rounded px-3 py-2 text-fg-muted-token" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="rounded bg-primary-token px-3 py-2 text-white disabled:opacity-50"
            disabled={!trimmed || saving}
            onClick={submit}
          >
            {saving ? 'Criando…' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};
