/**
 * Cancelar pedido pedindo o motivo — o mesmo modal na lista e no detalhe.
 *
 * 19/09: 0 dos 37 cancelados em 30 dias tinham motivo. O backend sempre
 * soube gravar (`cancel_reason`), mas as duas telas cancelavam com um "tem
 * certeza?" e nada mais. Os motivos prontos são os que acontecem numa
 * operação de delivery; "Outro" pede o texto.
 */
import React, { useEffect, useState } from 'react';
import { Button, Modal } from '../common';

export const MOTIVOS_DE_CANCELAMENTO = [
  'Cliente desistiu',
  'Acabou o produto',
  'Pagamento não foi confirmado',
  'Fora da área de entrega',
  'Pedido duplicado',
  'Loja sem condição de atender agora',
] as const;

const OUTRO = 'Outro';

interface Props {
  open: boolean;
  orderNumber: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

export const CancelarPedidoModal: React.FC<Props> = ({ open, orderNumber, loading, onClose, onConfirm }) => {
  const [escolha, setEscolha] = useState('');
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (open) { setEscolha(''); setTexto(''); }
  }, [open]);

  const motivo = escolha === OUTRO ? texto.trim() : escolha;

  return (
    <Modal isOpen={open} onClose={onClose} title="Cancelar pedido">
      <div className="space-y-4">
        <p className="text-fg-muted-token">
          Por que o pedido <strong className="text-fg-token">#{orderNumber}</strong> está sendo cancelado?
        </p>
        <div role="radiogroup" aria-label="Motivo do cancelamento" className="grid gap-2 sm:grid-cols-2">
          {[...MOTIVOS_DE_CANCELAMENTO, OUTRO].map((m) => (
            <label
              key={m}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                escolha === m ? 'border-brand bg-brand-soft text-fg-token' : 'border-border-token text-fg-token hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name="motivo-cancelamento"
                value={m}
                checked={escolha === m}
                onChange={() => setEscolha(m)}
                className="accent-[var(--brand)]"
              />
              {m}
            </label>
          ))}
        </div>
        {escolha === OUTRO && (
          <label className="block text-sm text-fg-token">
            Qual o motivo?
            <input
              type="text"
              value={texto}
              maxLength={140}
              onChange={(e) => setTexto(e.target.value)}
              className="mt-1 w-full superficie px-3 py-2 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
              autoFocus
            />
          </label>
        )}
        <p className="text-sm text-danger-token">O cancelamento não pode ser desfeito.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Voltar</Button>
          <Button variant="danger" disabled={!motivo} isLoading={loading} onClick={() => onConfirm(motivo)}>
            Confirmar cancelamento
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelarPedidoModal;
