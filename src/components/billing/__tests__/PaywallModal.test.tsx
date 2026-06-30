import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaywallModal } from '../PaywallModal';

describe('PaywallModal', () => {
  it('não renderiza quando open=false', () => {
    render(<PaywallModal open={false} message="x" onClose={() => {}} />);
    expect(screen.queryByText(/faça upgrade/i)).toBeNull();
  });

  it('mostra a mensagem e o CTA quando open=true', () => {
    render(<PaywallModal open message="Limite do plano atingido (50 produtos)." onClose={() => {}} />);
    expect(screen.getByText(/limite do plano atingido/i)).toBeTruthy();
    expect(screen.getByText(/ver planos/i)).toBeTruthy();
  });
});
