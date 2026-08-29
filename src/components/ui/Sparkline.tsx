/**
 * Sparkline — a forma dos últimos dias, dentro do card.
 *
 * Número sozinho não diz se é bom. "R$ 1.557 hoje" pode ser o melhor dia do mês
 * ou metade do normal, e o comparativo com ontem responde só metade, porque
 * ontem pode ter sido atípico. Uma linha de 14 dias responde de relance.
 *
 * SEM EIXO, SEM RÓTULO, SEM GRADE. Não é um gráfico pequeno: é textura. Quem
 * quer o valor exato lê o número que está logo acima; quem quer a leitura fina
 * abre o relatório. Colocar eixo aqui é transformar um sinal de meio segundo
 * numa tarefa de leitura.
 *
 * DUAS ARMADILHAS QUE ELE EVITA:
 *
 * 1. Série constante (inclusive toda zerada) tem amplitude zero. Normalizar
 *    dividindo por ela dá NaN e some o desenho; a linha vai para o meio, reta.
 *
 * 2. Um pico isolado esmaga o resto contra o chão. A escala parte do MENOR
 *    valor e não de zero justamente para preservar a variação do dia a dia —
 *    aqui interessa a forma, não a magnitude absoluta.
 */
import React, { useId } from 'react';

import { useTracoQueDesenha } from '../../hooks/useTracoQueDesenha';
import { cn } from '../../utils/cn';

export interface SparklineProps {
  valores: number[];
  /** Descrição para leitor de tela. A linha é decorativa sem isto. */
  rotulo: string;
  /** Cor da linha. Default: a cor do texto herdada. */
  cor?: string;
  className?: string;
}

const LARGURA = 100;
const ALTURA = 28;

export const Sparkline: React.FC<SparklineProps> = ({ valores, rotulo, cor, className }) => {
  // A linha chega desenhando, da esquerda para a direita — o mesmo sentido em
  // que o leitor já pensa o tempo. Redesenha quando a série muda.
  const refDaLinha = useTracoQueDesenha<SVGPathElement>([valores.join(',')]);
  const id = useId();

  // Menos de dois pontos não é uma linha, é um ponto — e ponto solto num card
  // lê como sujeira de renderização.
  if (!valores || valores.length < 2) return null;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const amplitude = max - min;

  const pontos = valores.map((v, i) => {
    const x = (i / (valores.length - 1)) * LARGURA;
    // Amplitude zero (série constante ou toda zerada): a linha vai para o meio,
    // reta. Dividir por zero daria NaN e o desenho sumiria.
    const y = amplitude === 0 ? ALTURA / 2 : ALTURA - ((v - min) / amplitude) * ALTURA;
    return [x, y] as const;
  });

  const linha = pontos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${linha} L${LARGURA},${ALTURA} L0,${ALTURA} Z`;
  const [ux, uy] = pontos[pontos.length - 1];

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={rotulo}
      className={cn('h-7 w-full overflow-visible', className)}
      style={{ color: cor }}
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#grad-${id})`} />
      <path
        ref={refDaLinha}
        d={linha}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* O ponto de hoje. Sem ele o olho não sabe de que lado a linha termina —
          e a leitura "está subindo ou caindo" depende de saber onde é o agora. */}
      <circle cx={ux} cy={uy} r="2" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

Sparkline.displayName = 'Sparkline';

export default Sparkline;
