import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

/**
 * Desenha um traço de SVG da esquerda para a direita, uma vez, ao aparecer.
 *
 * A sparkline surgia inteira de uma vez. Desenhando, ela conta a mesma coisa
 * que já está na cabeça de quem lê: o tempo passando. A linha não muda — só
 * chega andando.
 *
 * `stroke-dashoffset` sobre o comprimento REAL do traço é o que faz isso, e é
 * território de anime.js: CSS não conhece o comprimento, e o recharts não
 * expõe o path para animar.
 *
 * @param dependencias Redesenha quando mudarem (ex.: o `d` do path).
 */
export function useTracoQueDesenha<T extends SVGGeometryElement>(
  dependencias: unknown[] = [],
  duracao = 700,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const menosMovimento =
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (menosMovimento) return;

    // jsdom (e SVG fora do documento) não implementa getTotalLength. Sem esta
    // guarda a tela inteira cai por causa de um enfeite — troca ruim.
    let comprimento = 0;
    try {
      comprimento = typeof el.getTotalLength === 'function' ? el.getTotalLength() : 0;
    } catch {
      comprimento = 0;
    }
    if (!comprimento) return;

    el.style.strokeDasharray = String(comprimento);
    el.style.strokeDashoffset = String(comprimento);

    const anim = animate(el, {
      strokeDashoffset: 0,
      duration: duracao,
      ease: 'outQuart',
      // Solta o dash no fim: deixá-lo preso quebra qualquer tracejado que o
      // componente venha a querer depois.
      onComplete: () => {
        el.style.strokeDasharray = '';
        el.style.strokeDashoffset = '';
      },
    });

    return () => { anim.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  return ref;
}
