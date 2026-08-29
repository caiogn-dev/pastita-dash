import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSeriesChart } from '../TimeSeriesChart';

/**
 * O contrato de `TimeSeriesChart`, escrito ANTES de trocar o motor.
 *
 * O recharts custava 110 kB comprimidos — o maior peso do painel — para dois
 * componentes e seis consumidores. A troca só vale se NENHUM consumidor
 * precisar mudar: as props continuam as mesmas, o desenho é que passa a ser
 * SVG próprio.
 *
 * Levantamento dos seis chamadores: todas as props são usadas de verdade
 * (xKey e yKey 6x, valueFormat/type/height 4x, yTickFormat/xTickFormat 3x,
 * color 2x, tooltipLabelFormat 1x). Nenhuma é morta, nenhuma pode sumir.
 */

const DADOS = [
  { dia: '2026-08-24', total: 120 },
  { dia: '2026-08-25', total: 340 },
  { dia: '2026-08-26', total: 90 },
  { dia: '2026-08-27', total: 305 },
];

const padrao = {
  data: DADOS,
  xKey: 'dia',
  yKey: 'total',
  label: 'Receita',
};

describe('o que a tela mostra', () => {
  it('descreve a série para quem não enxerga o desenho', () => {
    render(<TimeSeriesChart {...padrao} />);
    expect(screen.getByRole('img', { name: /receita/i })).toBeInTheDocument();
  });

  it('desenha um ponto por linha de dado', () => {
    const { container } = render(<TimeSeriesChart {...padrao} />);
    expect(container.querySelectorAll('[data-ponto]')).toHaveLength(DADOS.length);
  });

  it('sem dado, não finge um gráfico vazio', () => {
    const { container } = render(<TimeSeriesChart {...padrao} data={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('aguenta um ponto só sem quebrar', () => {
    const { container } = render(
      <TimeSeriesChart {...padrao} data={[{ dia: 'x', total: 5 }]} />,
    );
    expect(container.querySelectorAll('[data-ponto]')).toHaveLength(1);
  });

  it('aguenta série toda em zero sem dividir por zero', () => {
    const zeros = DADOS.map((d) => ({ ...d, total: 0 }));
    const { container } = render(<TimeSeriesChart {...padrao} data={zeros} />);
    expect(container.querySelectorAll('[data-ponto]')).toHaveLength(4);
  });
});

describe('área e barra', () => {
  it('área é o padrão', () => {
    const { container } = render(<TimeSeriesChart {...padrao} />);
    expect(container.querySelector('[data-linha]')).not.toBeNull();
  });

  it('barra desenha uma barra por ponto', () => {
    const { container } = render(<TimeSeriesChart {...padrao} type="bar" />);
    expect(container.querySelectorAll('[data-barra]')).toHaveLength(DADOS.length);
  });
});

describe('formatadores — é aqui que o número vira dinheiro', () => {
  it('valueFormat manda no valor lido', () => {
    render(
      <TimeSeriesChart
        {...padrao}
        valueFormat={(v) => `R$ ${v},00`}
      />,
    );
    // O valor formatado precisa alcançar quem usa leitor de tela.
    expect(screen.getByRole('img', { name: /R\$ 340,00/ })).toBeInTheDocument();
  });

  it('xTickFormat encurta o rótulo do eixo', () => {
    render(<TimeSeriesChart {...padrao} xTickFormat={(v) => v.slice(-2)} />);
    expect(screen.getByText('27')).toBeInTheDocument();
  });

  it('yTickFormat manda no eixo vertical', () => {
    render(<TimeSeriesChart {...padrao} yTickFormat={(v) => `${v}k`} />);
    // Três marcas no eixo: piso, meio e teto.
    expect(screen.getAllByText(/k$/).length).toBe(3);
  });

  it('yTickFormat ausente cai no valueFormat', () => {
    render(<TimeSeriesChart {...padrao} valueFormat={(v) => `#${v}`} />);
    expect(screen.getAllByText(/^#/).length).toBeGreaterThan(0);
  });
});

describe('cor', () => {
  it('usa a cor da marca por padrão', () => {
    const { container } = render(<TimeSeriesChart {...padrao} />);
    expect(container.querySelector('svg')?.getAttribute('style'))
      .toContain('var(--brand)');
  });

  it('aceita a cor que o chamador pedir', () => {
    const { container } = render(<TimeSeriesChart {...padrao} color="#ff0000" />);
    // jsdom normaliza hex para rgb(); o que importa é a cor ter chegado.
    expect(container.querySelector('svg')?.getAttribute('style'))
      .toMatch(/#ff0000|rgb\(255, ?0, ?0\)/);
  });
});

describe('leitura ponto a ponto', () => {
  it('passar o mouse num ponto revela o valor daquele dia', () => {
    const { container } = render(
      <TimeSeriesChart {...padrao} valueFormat={(v) => `R$ ${v}`} />,
    );
    const alvos = container.querySelectorAll('[data-alvo]');
    expect(alvos.length).toBe(DADOS.length);

    fireEvent.mouseEnter(alvos[1]);
    expect(screen.getByRole('tooltip')).toHaveTextContent('R$ 340');
  });

  it('tooltipLabelFormat manda no cabeçalho', () => {
    const { container } = render(
      <TimeSeriesChart {...padrao} tooltipLabelFormat={(v) => `dia ${v.slice(-2)}`} />,
    );
    fireEvent.mouseEnter(container.querySelectorAll('[data-alvo]')[0]);
    expect(screen.getByRole('tooltip')).toHaveTextContent('dia 24');
  });

  it('sai o mouse, some a leitura', () => {
    const { container } = render(<TimeSeriesChart {...padrao} />);
    const alvo = container.querySelectorAll('[data-alvo]')[0];
    fireEvent.mouseEnter(alvo);
    expect(screen.queryByRole('tooltip')).not.toBeNull();
    fireEvent.mouseLeave(alvo);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe('altura', () => {
  it('respeita a altura pedida', () => {
    const { container } = render(<TimeSeriesChart {...padrao} height={240} />);
    expect((container.firstChild as HTMLElement).style.height).toBe('240px');
  });
});
