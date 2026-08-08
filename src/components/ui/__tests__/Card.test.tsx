import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card } from '../Card';
import { Badge } from '../Badge';

describe('Card (canônico)', () => {
  it('separa do fundo por ELEVAÇÃO, não por borda', () => {
    // A borda cinza sólida cercava o bloco e achatava a tela: tudo virava
    // retângulo delimitado no mesmo plano. A sombra ampla e fraca faz o mesmo
    // trabalho de separar do fundo, mas por profundidade — o card parece
    // pousado, não emoldurado.
    render(<Card data-testid="card">conteúdo</Card>);
    const el = screen.getByTestId('card');
    expect(el.className).toContain('bg-surface');
    expect(el.className).toContain('shadow-repouso');
    expect(el.className).not.toContain('border-border-token');
  });

  it('a variante outline mantém a borda — é o que ela é', () => {
    render(<Card variant="outline" data-testid="card">x</Card>);
    expect(screen.getByTestId('card').className).toContain('border-border-token');
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
  it('tone success aplica token semântico verde', () => {
    render(<Badge tone="success">OK</Badge>);
    const el = screen.getByText('OK');
    expect(el.className).toContain('bg-[var(--success-soft)]');
    expect(el.className).toContain('text-[var(--success)]');
  });

  it('tone brand preserva identidade da marca', () => {
    render(<Badge tone="brand">Marca</Badge>);
    const el = screen.getByText('Marca');
    expect(el.className).toContain('bg-brand-soft');
    expect(el.className).toContain('text-brand-ink');
  });

  it('tone neutral aplica surface-2', () => {
    render(<Badge tone="neutral">N</Badge>);
    expect(screen.getByText('N').className).toContain('bg-surface-2');
  });
});
