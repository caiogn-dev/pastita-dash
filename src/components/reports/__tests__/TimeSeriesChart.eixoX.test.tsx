import React from 'react';
import { render } from '@testing-library/react';
import { TimeSeriesChart } from '../TimeSeriesChart';

/**
 * O eixo X virou uma fileira de zeros.
 *
 * 01/set/2026, "Receita por dia" na home da Cê Saladas. O eixo, com 28 dias,
 * aparecia assim para o dono:
 *
 *     0…  0…  0…  0…  1…  1…  1…  2…  2…  2…  3…
 *
 * Medido no Chrome: cada rótulo recebia 21px e "04/08" precisa de 32px. O
 * componente desenhava UM rótulo POR PONTO num `flex justify-between`, então
 * 28 datas dividiam 591px e a classe `.truncate` cortava cada uma no primeiro
 * dígito. Como todo dia do mês começa com 0, 1, 2 ou 3, o eixo inteiro virou
 * ruído — pior que não ter eixo, porque ocupa espaço e não informa nada.
 *
 * Junto vinha um segundo defeito: com `justify-between` e itens de larguras
 * diferentes, o rótulo do meio NÃO fica embaixo da sua barra. O primeiro e o
 * último alinham; o resto vai escorregando.
 *
 * Contrato: o eixo mostra POUCOS rótulos, cada um inteiro, ancorado na posição
 * x do seu próprio ponto. Série curta continua mostrando tudo.
 */

const serie = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    dia: `2026-08-${String(i + 1).padStart(2, '0')}`,
    total: 100 + i,
  }));

const padrao = { xKey: 'dia', yKey: 'total', label: 'Receita' };

const rotulos = (c: HTMLElement) =>
  [...c.querySelectorAll('[data-tick-x]')].map((e) => e.textContent?.trim() ?? '');

describe('eixo X legível', () => {
  it('série longa não desenha um rótulo por dia', () => {
    const { container } = render(<TimeSeriesChart {...padrao} data={serie(28)} />);
    const visiveis = rotulos(container);

    expect(visiveis.length).toBeGreaterThan(1);
    expect(visiveis.length).toBeLessThanOrEqual(7);
  });

  it('série curta continua mostrando todos os dias', () => {
    const { container } = render(<TimeSeriesChart {...padrao} data={serie(4)} />);
    expect(rotulos(container)).toHaveLength(4);
  });

  it('nunca corta um rótulo que decidiu mostrar', () => {
    // `.truncate` no rótulo é o que produziu "0…". Se ele cabe, cabe inteiro;
    // se não cabe, não é desenhado.
    const { container } = render(<TimeSeriesChart {...padrao} data={serie(28)} />);
    for (const e of container.querySelectorAll('[data-tick-x]')) {
      expect(e.className).not.toMatch(/\btruncate\b/);
    }
  });

  it('o primeiro e o último dia estão sempre lá', () => {
    // São eles que dizem o PERÍODO do gráfico. Sem as pontas o eixo não situa.
    const { container } = render(
      <TimeSeriesChart {...padrao} data={serie(28)} xTickFormat={(v) => v.slice(-2)} />,
    );
    const visiveis = rotulos(container);
    expect(visiveis[0]).toBe('01');
    expect(visiveis[visiveis.length - 1]).toBe('28');
  });

  it('cada rótulo é ancorado na posição do seu ponto', () => {
    // `justify-between` desalinha o miolo: o rótulo precisa saber o x dele.
    const { container } = render(<TimeSeriesChart {...padrao} data={serie(28)} />);
    const ancoras = [...container.querySelectorAll('[data-tick-x]')].map(
      (e) => (e as HTMLElement).style.left,
    );
    expect(ancoras.every((l) => l.endsWith('%'))).toBe(true);
    // Primeiro à esquerda, último à direita, em ordem crescente.
    const nums = ancoras.map((l) => parseFloat(l));
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
    expect(nums[0]).toBeLessThan(nums[nums.length - 1]);
  });

  it('respeita o xTickFormat do chamador', () => {
    const { container } = render(
      <TimeSeriesChart {...padrao} data={serie(28)} xTickFormat={() => 'X'} />,
    );
    expect(new Set(rotulos(container))).toEqual(new Set(['X']));
  });

  it('um ponto só não quebra a conta', () => {
    const { container } = render(<TimeSeriesChart {...padrao} data={serie(1)} />);
    expect(rotulos(container)).toHaveLength(1);
  });
});
