import { Fragment, type FC } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import { useOnboardingWizard, type WizardStepDef } from './useOnboardingWizard';

interface OnboardingWizardProps {
  open: boolean;
  steps: WizardStepDef[];
  onClose: () => void;
  startKey?: string;
}

const OnboardingWizard: FC<OnboardingWizardProps> = ({ open, steps, onClose, startKey }) => {
  const { index, current, total, isFirst, isLast, next, back } = useOnboardingWizard(steps, startKey);
  const pct = total > 0 ? ((index + 1) / total) * 100 : 0;

  function handleSaved() {
    if (isLast) onClose();
    else next();
  }

  if (!open || !current) return null;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border-token bg-surface-token shadow-2xl">
            <div className="border-b border-border-token px-6 py-4">
              <div className="flex items-center justify-between">
                {!isFirst ? (
                  <button onClick={back} aria-label="Voltar" className="text-fg-muted-token hover:text-fg-token">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                ) : <span className="w-5" />}
                <span className="text-sm text-fg-muted-token">{index + 1}/{total}</span>
                <button onClick={onClose} aria-label="Fechar" className="text-fg-muted-token hover:text-fg-token">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted-token">
                <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <h2 className="mb-4 text-lg font-semibold text-fg-token">{current.title}</h2>
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.key}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  {current.render({ onSaved: handleSaved })}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border-token px-6 py-4">
              <button onClick={handleSaved} className="text-sm text-fg-muted-token hover:text-fg-token">
                {isLast ? 'Concluir' : 'Pular'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
};

export default OnboardingWizard;
