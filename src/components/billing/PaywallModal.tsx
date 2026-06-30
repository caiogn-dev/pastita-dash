import { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface PaywallModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export function PaywallModal({ open, message, onClose }: PaywallModalProps) {
  // Fix 3: Escape-to-close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Fix 3: role="dialog" + aria-modal="true"
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Fix 2: bg-surface-token replaces bg-white; text-fg-token for headings */}
      <div
        className="w-full max-w-md rounded-lg bg-surface-token p-6 shadow-xl border border-border-token"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-fg-token">Faça upgrade do seu plano</h2>
        <p className="mt-2 text-sm text-fg-muted-token">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-3 py-2 text-sm text-fg-muted-token hover:text-fg-token transition-colors"
          >
            Agora não
          </button>
          {/* Fix 1: Link (SPA nav) + onClose; Fix 2: bg-brand tokens */}
          <Link
            to="/assinatura"
            onClick={onClose}
            className="rounded bg-brand px-3 py-2 text-sm text-white hover:opacity-90 transition-opacity"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}
