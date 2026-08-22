import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SectionCard } from '../shared';

/**
 * O `SectionCard` é a casca de TODA seção de relatório. Antes ele só conhecia
 * `loading`; numa falha de fetch a query devolvia `data: undefined` e a seção
 * caía nos fallbacks `?? 0` — renderizando "R$ 0,00"/listas vazias como se o
 * período fosse legitimamente vazio. Estes testes fixam o estado de erro: em
 * vez dos zeros enganosos, um aviso acionável com "Tentar novamente".
 */
describe('SectionCard — estado de erro', () => {
  it('renderiza o conteúdo quando não há loading nem erro', () => {
    render(
      <SectionCard title="Financeiro">
        <p>conteúdo real</p>
      </SectionCard>,
    );
    expect(screen.getByText('conteúdo real')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it('esconde o conteúdo e mostra aviso + botão de retry quando error', () => {
    const onRetry = jest.fn();
    render(
      <SectionCard title="Financeiro" error onRetry={onRetry}>
        <p>R$ 0,00</p>
      </SectionCard>,
    );
    // O número enganoso NÃO aparece — o operador não deve achar que faturou zero.
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /tentar novamente/i });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('mostra o aviso de erro mesmo sem onRetry (sem botão)', () => {
    render(
      <SectionCard title="Financeiro" error>
        <p>R$ 0,00</p>
      </SectionCard>,
    );
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
    // Ainda comunica a falha em vez de silenciar.
    expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument();
  });

  it('loading tem precedência sobre error (ainda buscando, não falhou)', () => {
    render(
      <SectionCard title="Financeiro" loading error onRetry={jest.fn()}>
        <p>conteúdo real</p>
      </SectionCard>,
    );
    expect(screen.queryByText('conteúdo real')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });
});
