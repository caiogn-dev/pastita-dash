/**
 * Barra de alterações — UM salvar para a página inteira, que só aparece
 * quando há o que salvar (padrão do editor de tema da Shopify). Antes o
 * Storefront tinha "Salvar exibição" no meio e "Salvar storefront" no fim.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { BarraDeAlteracoes } from '../BarraDeAlteracoes';

describe('BarraDeAlteracoes', () => {
  it('some quando não há alteração', () => {
    render(<BarraDeAlteracoes quantidade={0} onSalvar={() => {}} onDescartar={() => {}} />);
    expect(screen.queryByRole('region', { name: /alterações/i })).not.toBeInTheDocument();
  });

  it('conta, descarta e salva', () => {
    const onSalvar = jest.fn();
    const onDescartar = jest.fn();
    render(<BarraDeAlteracoes quantidade={3} onSalvar={onSalvar} onDescartar={onDescartar} />);
    expect(screen.getByRole('region', { name: /alterações/i })).toHaveTextContent('3 alterações');
    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));
    fireEvent.click(screen.getByRole('button', { name: /^salvar/i }));
    expect(onDescartar).toHaveBeenCalled();
    expect(onSalvar).toHaveBeenCalled();
  });

  it('singular e travada enquanto salva', () => {
    render(<BarraDeAlteracoes quantidade={1} salvando onSalvar={() => {}} onDescartar={() => {}} />);
    expect(screen.getByRole('region', { name: /alterações/i })).toHaveTextContent('1 alteração');
    expect(screen.getByRole('button', { name: /descartar/i })).toBeDisabled();
  });
});
