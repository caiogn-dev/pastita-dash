/**
 * EscolhaVisual — escolha excludente em que cada opção MOSTRA o resultado.
 * "Direita" escrito num cartão não diz nada; um cartão desenhado com a foto à
 * direita diz tudo (Storefront → Exibição, 13/10).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EscolhaVisual } from '../EscolhaVisual';

const opcoes = [
  { valor: 'topo', titulo: 'Em cima', desenho: <span data-testid="d-topo" /> },
  { valor: 'direita', titulo: 'À direita', desenho: <span data-testid="d-direita" />, dica: 'Lista estilo iFood' },
];

describe('EscolhaVisual', () => {
  it('é um radiogroup com o desenho de cada opção', () => {
    render(<EscolhaVisual rotulo="Foto" opcoes={opcoes} valor="topo" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Foto' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /em cima/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('d-direita')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /à direita/i })).toHaveAttribute('title', 'Lista estilo iFood');
  });

  it('clique e setas escolhem', () => {
    const onChange = jest.fn();
    render(<EscolhaVisual rotulo="Foto" opcoes={opcoes} valor="topo" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /à direita/i }));
    expect(onChange).toHaveBeenLastCalledWith('direita');
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('direita');
  });

  it('marca o que mudou e ainda não foi salvo', () => {
    const { rerender } = render(<EscolhaVisual rotulo="Foto" opcoes={opcoes} valor="topo" onChange={() => {}} />);
    expect(screen.queryByLabelText(/não salvo/i)).not.toBeInTheDocument();
    rerender(<EscolhaVisual rotulo="Foto" opcoes={opcoes} valor="topo" onChange={() => {}} mudou />);
    expect(screen.getByLabelText(/não salvo/i)).toBeInTheDocument();
  });
});
