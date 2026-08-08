/**
 * A linha dos últimos dias, dentro do card.
 *
 * Número sozinho não diz se é bom: "R$ 1.557 hoje" pode ser o melhor dia do mês
 * ou metade do normal, e o comparativo com ontem responde só metade porque
 * ontem pode ter sido atípico.
 *
 * Não é um gráfico pequeno — é textura. Por isso não tem eixo, rótulo nem
 * grade: quem quer o valor exato lê o número logo acima.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Sparkline } from '../Sparkline';

const caminho = () =>
  screen.getByRole('img').querySelectorAll('path')[1].getAttribute('d') ?? '';

describe('Sparkline', () => {
  it('desenha uma linha com um ponto por valor', () => {
    render(<Sparkline valores={[1, 5, 3, 8]} rotulo="Receita dos últimos dias" />);
    expect(caminho().match(/[ML]/g)).toHaveLength(4);
  });

  it('tem descrição para leitor de tela', () => {
    // Sem isso a linha é decorativa e a informação simplesmente não existe
    // para quem não a vê.
    render(<Sparkline valores={[1, 2]} rotulo="Receita dos últimos 14 dias" />);
    expect(screen.getByRole('img', { name: 'Receita dos últimos 14 dias' })).toBeInTheDocument();
  });

  it('série toda zerada vira linha reta, não desaparece', () => {
    // Amplitude zero dividiria por zero e produziria NaN no `d` — o desenho
    // sumiria e a loja sem venda ficaria com um card visualmente quebrado.
    render(<Sparkline valores={[0, 0, 0, 0]} rotulo="x" />);
    const d = caminho();
    expect(d).not.toMatch(/NaN/);
    expect(d).toContain('14.00'); // metade da altura
  });

  it('série constante também não quebra', () => {
    render(<Sparkline valores={[7, 7, 7]} rotulo="x" />);
    expect(caminho()).not.toMatch(/NaN/);
  });

  it('menos de dois pontos não renderiza', () => {
    // Um ponto solto num card lê como sujeira de renderização, não como dado.
    const { container } = render(<Sparkline valores={[5]} rotulo="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lista vazia não renderiza', () => {
    const { container } = render(<Sparkline valores={[]} rotulo="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marca o ponto de hoje na ponta direita', () => {
    // Sem o ponto, o olho não sabe de que lado a linha termina — e "está
    // subindo ou caindo" depende de saber onde é o agora.
    render(<Sparkline valores={[1, 9]} rotulo="x" />);
    expect(screen.getByRole('img').querySelector('circle')).toHaveAttribute('cx', '100');
  });
});
