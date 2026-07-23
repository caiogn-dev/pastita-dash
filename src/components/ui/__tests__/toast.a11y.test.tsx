import React from 'react';
import { render, screen } from '@testing-library/react';
import { Toast } from '../toast';

// O botão de fechar do toast é icon-only (XMarkIcon). Sem nome acessível,
// leitores de tela não anunciam o controle usado app-wide para dispensar avisos.
describe('Toast — acessibilidade do botão de fechar', () => {
  it('expõe nome acessível no botão de fechar', () => {
    render(
      <Toast id="t1" title="Pedido salvo" duration={0} showProgress={false} />
    );

    const fechar = screen.getByRole('button', { name: /fechar notificação/i });
    expect(fechar).toBeInTheDocument();
  });
});
