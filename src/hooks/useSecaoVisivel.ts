/**
 * Qual seção está na tela agora — para o trilho marcar a categoria certa
 * enquanto a página rola. Observa os elementos `#<prefixo><id>`.
 */
import { useEffect, useState } from 'react';

export function useSecaoVisivel(ids: string[], prefixo: string): string | null {
  const [visivel, setVisivel] = useState<string | null>(null);
  const chave = ids.join('|');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !ids.length) return undefined;
    const naTela = new Map<string, number>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const id = (e.target as HTMLElement).id.slice(prefixo.length);
          if (e.isIntersecting) naTela.set(id, e.boundingClientRect.top);
          else naTela.delete(id);
        }
        // A mais alta das que estão na tela é a que o operador está lendo.
        const primeira = [...naTela.entries()].sort((a, b) => a[1] - b[1])[0];
        if (primeira) setVisivel(primeira[0]);
      },
      { rootMargin: '-80px 0px -55% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(`${prefixo}${id}`);
      if (el) observador.observe(el);
    }
    return () => observador.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, prefixo]);

  return visivel;
}
