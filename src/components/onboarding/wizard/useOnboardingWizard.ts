import { useState, type ReactNode } from 'react';

export interface WizardStepDef {
  key: string;
  title: string;
  render: (props: { onSaved: () => void }) => ReactNode;
}

export function useOnboardingWizard(steps: WizardStepDef[], startKey?: string) {
  const found = startKey ? steps.findIndex((s) => s.key === startKey) : 0;
  const startIndex = found < 0 ? 0 : found;
  const [index, setIndex] = useState(startIndex);
  const total = steps.length;
  const next = () => setIndex((i) => Math.min(total - 1, i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));
  return {
    index,
    current: steps[index],
    total,
    isFirst: index === 0,
    isLast: index === total - 1,
    next,
    back,
  };
}
