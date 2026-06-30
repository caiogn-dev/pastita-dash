interface PaywallModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export function PaywallModal({ open, message, onClose }: PaywallModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Faça upgrade do seu plano</h2>
        <p className="mt-2 text-sm opacity-80">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-3 py-2 text-sm">Agora não</button>
          <a href="/assinatura" className="rounded bg-amber-600 px-3 py-2 text-sm text-white">Ver planos</a>
        </div>
      </div>
    </div>
  );
}
