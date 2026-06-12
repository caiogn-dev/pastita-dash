import React, { useState, useRef, useEffect } from 'react';
import { PauseCircleIcon, PlayCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { pauseProduct, unpauseProduct } from '../../services/commerce';

interface PauseProductButtonProps {
  productId: string;
  isPaused: boolean;
  onChanged: () => void;
}

const PAUSE_OPTIONS = [
  { label: '2 horas', minutes: 120 },
  { label: '4 horas', minutes: 240 },
  { label: 'Até amanhã', minutes: undefined },
];

/** Pausa rápida de item esgotado — 1 clique, sem editar o produto. */
const PauseProductButton: React.FC<PauseProductButtonProps> = ({ productId, isPaused, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const handlePause = async (minutes?: number) => {
    setLoading(true);
    setOpen(false);
    try {
      await pauseProduct(productId, minutes);
      toast.success(minutes ? `Item pausado por ${minutes / 60}h` : 'Item pausado até amanhã');
      onChanged();
    } catch {
      toast.error('Erro ao pausar item');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpause = async () => {
    setLoading(true);
    try {
      await unpauseProduct(productId);
      toast.success('Item disponível novamente');
      onChanged();
    } catch {
      toast.error('Erro ao retomar item');
    } finally {
      setLoading(false);
    }
  };

  if (isPaused) {
    return (
      <button
        type="button"
        onClick={handleUnpause}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 disabled:opacity-50"
      >
        <PlayCircleIcon className="h-4 w-4" />
        Retomar
      </button>
    );
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 disabled:opacity-50"
      >
        <PauseCircleIcon className="h-4 w-4" />
        Pausar
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {PAUSE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              role="menuitem"
              onClick={() => handlePause(opt.minutes)}
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PauseProductButton;
