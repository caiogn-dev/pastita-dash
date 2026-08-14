import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SectionCard } from '../shared';

describe('SectionCard — estado de erro', () => {
  it('mostra o conteúdo quando não há erro nem loading', () => {
    render(
      <SectionCard title="Bairros">
        <p>conteúdo real</p>
      </SectionCard>
    );
    expect(screen.getByText('conteúdo real')).toBeInTheDocument();
  });

  it('esconde o conteúdo e mostra aviso de falha quando error=true', () => {
    render(
      <SectionCard title="Bairros" error>
        <p>conteúdo real</p>
      </SectionCard>
    );
    // Nunca mostrar o conteúdo (que na falha viria vazio/zerado e enganaria o operador).
    expect(screen.queryByText('conteúdo real')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument();
  });

  it('oferece botão "Tentar novamente" que chama onRetry', () => {
    const onRetry = jest.fn();
    render(
      <SectionCard title="Bairros" error onRetry={onRetry}>
        <p>conteúdo real</p>
      </SectionCard>
    );
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sem onRetry não renderiza o botão de retry', () => {
    render(
      <SectionCard title="Bairros" error>
        <p>conteúdo real</p>
      </SectionCard>
    );
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it('loading tem precedência sobre erro (mostra spinner, não o aviso)', () => {
    render(
      <SectionCard title="Bairros" error loading>
        <p>conteúdo real</p>
      </SectionCard>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('conteúdo real')).not.toBeInTheDocument();
  });
});
