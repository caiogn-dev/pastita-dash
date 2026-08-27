import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// A tela de erro é a única que o cliente vê quando tudo o mais falhou — e era
// a que menos parecia o produto: fundo branco cravado que ignora o tema,
// botão azul (a marca é ouro sobre carvão) e texto em inglês num painel em
// português.

const Explode = () => {
  throw new Error('falha de teste');
};

// O React registra o erro no console mesmo com boundary; silencia o ruído.
const silenciarConsole = () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  return () => spy.mockRestore();
};

describe('tela de erro', () => {
  it('fala português', () => {
    const restaurar = silenciarConsole();
    render(<ErrorBoundary><Explode /></ErrorBoundary>);
    expect(screen.getByText(/algo deu errado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    restaurar();
  });

  it('não pinta superfície nem texto com cor crua — respeita o tema', () => {
    const restaurar = silenciarConsole();
    const { container } = render(<ErrorBoundary><Explode /></ErrorBoundary>);
    const cru = container.innerHTML.match(/bg-white|text-gray-\d|bg-gray-\d|bg-blue-\d/g);
    expect(cru).toBeNull();
    restaurar();
  });

  it('a ação principal usa a cor da marca, não azul de framework', () => {
    const restaurar = silenciarConsole();
    render(<ErrorBoundary><Explode /></ErrorBoundary>);
    expect(screen.getByRole('button', { name: /tentar de novo/i }).className)
      .toMatch(/bg-brand/);
    restaurar();
  });
});
