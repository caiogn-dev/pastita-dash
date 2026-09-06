import React, { useState } from 'react';

import { Button, Input, Modal, ModalFooter } from '../../../components/ui';

interface Props {
  isOpen: boolean;
  saving?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

/**
 * Este modal era montado à mão — `fixed inset-0 z-50` com um `<div>` por cima.
 * Sem `role="dialog"`, sem `aria-modal`, sem trava de foco: o Tab saía dele e
 * ia passear pelo cardápio atrás, e o leitor de tela continuava lendo a página
 * inteira como se nada tivesse aberto. O `Modal` do painel resolve os quatro.
 */
export const AddCategoryModal: React.FC<Props> = ({ isOpen, saving, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  const submit = () => {
    if (!trimmed || saving) return;
    onCreate(trimmed);
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Nova categoria" size="sm">
      <Input
        autoFocus
        aria-label="nome da categoria"
        placeholder="Ex.: Bebidas"
        value={name}
        onChange={(e) => setName(e.target.value)}
        // Enter cria: é um campo só, e obrigar o mouse aqui é fricção pura.
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!trimmed} isLoading={saving} onClick={submit}>
          Criar
        </Button>
      </ModalFooter>
    </Modal>
  );
};
