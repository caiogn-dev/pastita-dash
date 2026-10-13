/**
 * Controles do painel de propriedades (Storefront refeito em 13/10, no padrão
 * Figma/Framer/editor de tema da Shopify): a página de verdade no centro, e à
 * direita linhas curtas — rótulo em cima, controle compacto embaixo. Nada de
 * cartões gigantes empilhados.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Segmentado } from '../Segmentado';
import { Deslizador } from '../Deslizador';
import { Propriedade } from '../Propriedade';

const opcoes = [
  { valor: 'topo', rotulo: 'Em cima', icone: <svg data-testid="i-topo" /> },
  { valor: 'direita', rotulo: 'Direita', icone: <svg data-testid="i-direita" />, dica: 'Lista estilo iFood' },
];

describe('Segmentado', () => {
  it('radiogroup compacto com ícone e nome', () => {
    render(<Segmentado rotulo="Foto" opcoes={opcoes} valor="topo" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Foto' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /em cima/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('i-direita')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /direita/i })).toHaveAttribute('title', 'Lista estilo iFood');
  });

  it('clique e setas', () => {
    const onChange = jest.fn();
    render(<Segmentado rotulo="Foto" opcoes={opcoes} valor="topo" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /direita/i }));
    expect(onChange).toHaveBeenLastCalledWith('direita');
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('direita');
  });

  it('só ícone: o nome continua para leitor de tela e tooltip', () => {
    render(<Segmentado rotulo="Foto" opcoes={opcoes} valor="topo" onChange={() => {}} soIcone />);
    const r = screen.getByRole('radio', { name: /em cima/i });
    expect(r).toHaveAttribute('title', 'Em cima');
  });
});

describe('Deslizador', () => {
  it('mostra o valor formatado e muda ao arrastar', () => {
    const onMudar = jest.fn();
    render(
      <Deslizador rotulo="Descrição" valor={0} min={0} max={300} passo={10} onMudar={onMudar}
        formatar={(n) => (n === 0 ? 'Automático' : `${n} letras`)} />,
    );
    const s = screen.getByRole('slider', { name: 'Descrição' });
    expect(s).toHaveAttribute('aria-valuetext', 'Automático');
    expect(screen.getByText('Automático')).toBeInTheDocument();
    fireEvent.change(s, { target: { value: '120' } });
    expect(onMudar).toHaveBeenCalledWith(120);
  });
});

describe('Propriedade', () => {
  it('rótulo, valor à direita e ponto do não salvo', () => {
    const { rerender } = render(<Propriedade rotulo="Formato" valor="1:1"><span>controle</span></Propriedade>);
    expect(screen.getByText('Formato')).toBeInTheDocument();
    expect(screen.getByText('1:1')).toBeInTheDocument();
    expect(screen.queryByLabelText(/não salvo/i)).not.toBeInTheDocument();
    rerender(<Propriedade rotulo="Formato" mudou><span>controle</span></Propriedade>);
    expect(screen.getByLabelText(/não salvo/i)).toBeInTheDocument();
  });
});

describe('Segmentado empilhado', () => {
  it('ícone em cima e nome embaixo, nome visível', () => {
    render(<Segmentado rotulo="Foto" opcoes={opcoes} valor="topo" onChange={() => {}} empilhado />);
    expect(screen.getByRole('radio', { name: /direita/i })).toHaveTextContent('Direita');
    expect(screen.getByRole('radio', { name: /direita/i }).className).toContain('flex-col');
  });
});
