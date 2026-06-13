import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card } from '../Card';
import { Badge } from '../Badge';

describe('Card (canônico)', () => {
  it('aplica border e surface', () => {
    render(<Card data-testid="card">conteúdo</Card>);
    const el = screen.getByTestId('card');
    expect(el.className).toContain('border');
    expect(el.className).toContain('bg-surface');
  });

  it('mescla className extra e repassa props', () => {
    render(
      <Card data-testid="card" className="p-4">
        x
      </Card>
    );
    expect(screen.getByTestId('card').className).toContain('p-4');
  });
});

describe('Badge (canônico)', () => {
  it('tone success aplica brand-soft', () => {
    render(<Badge tone="success">OK</Badge>);
    const el = screen.getByText('OK');
    expect(el.className).toContain('bg-brand-soft');
    expect(el.className).toContain('text-brand');
  });

  it('tone neutral aplica surface-2', () => {
    render(<Badge tone="neutral">N</Badge>);
    expect(screen.getByText('N').className).toContain('bg-surface-2');
  });
});
