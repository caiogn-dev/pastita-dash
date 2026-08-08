/**
 * O resumo confirma o que você já preencheu, sem reabrir abas.
 *
 * No formulário de produto (seis abas) você marca algo em Preços, vai para
 * Estoque, volta para Mídia — e ao chegar em salvar não lembra o que escolheu.
 * Conferir custa reabrir cada aba.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FormSummary } from '../FormSummary';

describe('FormSummary', () => {
  it('mostra rótulo e valor de cada linha', () => {
    render(<FormSummary linhas={[{ rotulo: 'Preço', valor: 'R$ 29,90' }]} />);
    expect(screen.getByText('Preço')).toBeInTheDocument();
    expect(screen.getByText('R$ 29,90')).toBeInTheDocument();
  });

  it('campo vazio vira travessão, não some', () => {
    // Linha ausente lê como "não existe esse campo"; linha com "—" lê como
    // "existe e está vazio". A segunda é a verdade, e é acionável.
    render(<FormSummary linhas={[{ rotulo: 'Categoria', valor: '' }]} />);
    expect(screen.getByText('Categoria')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('zero conta como vazio', () => {
    // Preço 0 não é "preço definido como zero" em nenhum caso real deste
    // painel — é campo não preenchido.
    render(<FormSummary linhas={[{ rotulo: 'Preço', valor: 0 }]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('sem linhas não renderiza nada', () => {
    const { container } = render(<FormSummary linhas={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
