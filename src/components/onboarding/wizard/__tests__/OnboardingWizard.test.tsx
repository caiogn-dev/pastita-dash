import { render, screen, fireEvent } from '@testing-library/react';

// framer-motion: stub que só renderiza children (evita timers/act no jsdom)
jest.mock('framer-motion', () => ({
  __esModule: true,
  motion: new Proxy({}, { get: () => (p: { children?: React.ReactNode }) => <div>{p.children}</div> }),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// @headlessui/react: passthrough simples (evita transições async/act no jsdom).
jest.mock('@headlessui/react', () => {
  const Dialog = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  Dialog.Panel = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Transition = ({ show, children }: { show?: boolean; children?: React.ReactNode }) =>
    show ? <>{children}</> : null;
  return { __esModule: true, Dialog, Transition };
});

import OnboardingWizard from '../OnboardingWizard';

const steps = [
  { key: 'a', title: 'Passo A', render: ({ onSaved }: { onSaved: () => void }) => <button onClick={onSaved}>salvar-a</button> },
  { key: 'b', title: 'Passo B', render: ({ onSaved }: { onSaved: () => void }) => <button onClick={onSaved}>salvar-b</button> },
];

describe('OnboardingWizard', () => {
  it('mostra o passo atual e avança ao salvar', () => {
    render(<OnboardingWizard open steps={steps} onClose={() => {}} />);
    expect(screen.getByText('Passo A')).toBeTruthy();
    fireEvent.click(screen.getByText('salvar-a'));
    expect(screen.getByText('Passo B')).toBeTruthy();
  });

  it('Pular avança sem salvar', () => {
    render(<OnboardingWizard open steps={steps} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /pular/i }));
    expect(screen.getByText('Passo B')).toBeTruthy();
  });

  it('não renderiza quando open=false', () => {
    const { container } = render(<OnboardingWizard open={false} steps={steps} onClose={() => {}} />);
    expect(container.textContent).not.toMatch(/passo a/i);
  });
});
