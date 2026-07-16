import { Link } from 'react-router-dom';
import { Modal } from '../ui/modal';

interface PaywallModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

/**
 * Paywall de upgrade de plano. Usa o Modal canônico (focus-trap, Escape,
 * overlay-click e scroll-lock vêm de graça).
 */
export function PaywallModal({ open, message, onClose }: PaywallModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Faça upgrade do seu plano">
      <p className="text-sm text-fg-muted-token">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-3 py-2 text-sm text-fg-muted-token hover:text-fg-token transition-colors"
        >
          Agora não
        </button>
        <Link
          to="/assinatura"
          onClick={onClose}
          className="rounded bg-brand px-3 py-2 text-sm text-white hover:opacity-90 transition-opacity"
        >
          Ver planos
        </Link>
      </div>
    </Modal>
  );
}
