import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Aviso } from '../Aviso';

describe('Aviso', () => {
  it('erro é alert, os outros são status, e o tom vai no data-tom', () => {
    const { rerender } = render(<Aviso tom="erro" titulo="Falhou" />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-tom', 'erro');
    rerender(<Aviso tom="sucesso" titulo="Tudo certo">Os pagamentos caem na conta da loja.</Aviso>);
    expect(screen.getByRole('status')).toHaveTextContent('Tudo certo');
    expect(screen.getByRole('status')).toHaveTextContent('Os pagamentos caem na conta da loja.');
  });
  it('fechar chama o callback', async () => {
    const fechar = jest.fn();
    render(<Aviso tom="atencao" titulo="Atenção" onFechar={fechar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(fechar).toHaveBeenCalled();
  });
});
