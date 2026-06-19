import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div
        data-testid="bottomsheet-backdrop"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="relative max-h-[85vh] overflow-auto rounded-t-2xl bg-bg-card"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
          <h2 className="text-base font-semibold text-fg-primary">{title}</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="p-2">
            <XMarkIcon className="h-5 w-5 text-fg-muted" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
