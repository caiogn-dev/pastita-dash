import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

/**
 * Anima um número subindo até o valor real.
 *
 * "R$ 305,62" aparecendo pronto e "R$ 305,62" subindo de zero contam coisas
 * diferentes: a segunda diz que o número é de HOJE e ainda está andando. É a
 * única animação do painel que carrega informação em vez de enfeite — por isso
 * ela existe, e por isso não se espalha para o resto.
 *
 * Nem CSS nem framer-motion interpolam número. anime.js interpola, e o import
 * é do subcaminho `animate` — o pacote é modular, não entra inteiro no bundle.
 *
 * Duas regras inegociáveis:
 *  - quem pede menos movimento no sistema recebe o valor final, sem animação;
 *  - o último quadro é o valor REAL, nunca o arredondado da interpolação.
 */
export function useNumeroQueSobe<T extends HTMLElement>(
  valor: number,
  formatar: (n: number) => string,
  duracao = 900,
) {
  const ref = useRef<T>(null);
  // O formatador costuma ser uma arrow nova a cada render; guardá-lo numa ref
  // evita reiniciar a animação a cada pai que re-renderiza.
  const formatarRef = useRef(formatar);
  formatarRef.current = formatar;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const alvo = Number.isFinite(valor) ? valor : 0;
    const escrever = (n: number) => { el.textContent = formatarRef.current(n); };

    const menosMovimento =
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (menosMovimento || duracao <= 0) {
      escrever(alvo);
      return;
    }

    const estado = { n: 0 };
    const anim = animate(estado, {
      n: alvo,
      duration: duracao,
      ease: 'outQuart',
      onUpdate: () => escrever(estado.n),
      // Sem isto, o último quadro pode parar em 305,61 por arredondamento —
      // e um painel de dinheiro não erra centavo por causa de animação.
      onComplete: () => escrever(alvo),
    });

    return () => { anim.pause(); };
  }, [valor, duracao]);

  return ref;
}
